import json
from base64 import b64decode
from io import BytesIO
from uuid import uuid4
from zipfile import ZipFile

from tests import test_backend
from tests.test_backend import api, attempt, authored, onboarding, project, update_account

app = test_backend.app
identities = test_backend.identities


def test_given_project_updates_when_listing_and_restoring_revisions_then_history_and_attempt_pin_persist(
    app, identities
):
    first, stranger = identities
    onboarding(app, first)
    onboarding(app, stranger)
    created = project(app, first, "Initial Org")
    pid = created["id"]
    updated = api(
        app,
        "PATCH",
        f"/projects/{pid}",
        first,
        {
            "version": 1,
            "name": "Updated Org",
            "description": "Expanded description",
            "region": "Central Asia",
            "legalEntity": "Nonprofit",
            "archived": False,
            "changeSummary": "Added region and legal entity",
        },
    )
    assert updated.status_code == 200 and updated.json["version"] == 2
    history = api(app, "GET", f"/projects/{pid}/revisions", first)
    assert history.status_code == 200
    assert [row["version"] for row in history.json] == [2, 1]
    assert history.json[0]["summary"] == "Added region and legal entity"
    assert history.json[1]["name"] == "Initial Org"
    assert api(app, "GET", f"/projects/{pid}/revisions", stranger).status_code == 404

    restored = api(app, "POST", f"/projects/{pid}/revisions/1/restore", first, {"version": 2})
    assert restored.status_code == 200 and restored.json["version"] == 3
    assert restored.json["name"] == "Initial Org"

    draft = attempt(app, first, pid, "Pinned attempt")
    assert draft["profileVersion"] == 3
    re_pinned = api(
        app,
        "PATCH",
        f"/attempts/{draft['id']}",
        first,
        {**authored(draft), "profileVersion": 2},
    )
    assert re_pinned.status_code == 200 and re_pinned.json["profileVersion"] == 2
    bad_pin = api(
        app,
        "PATCH",
        f"/attempts/{draft['id']}",
        first,
        {**authored(draft), "version": re_pinned.json["version"], "profileVersion": 99},
    )
    assert bad_pin.status_code == 422


def test_given_attempt_outputs_and_export_narrative_when_saved_and_exported_then_audit_invalidates_and_narrative_exports(
    app, identities
):
    first, _ = identities
    onboarding(app, first)
    workspace = project(app, first)
    record = attempt(app, first, workspace["id"], "Export Parity Proposal")
    path = "/attempts/" + record["id"]

    payload = {
        **authored(record),
        "outputs": ["application", "pitch-deck"],
        "exportNarrative": "Custom executive export body for review.",
    }
    saved = api(app, "PATCH", path, first, payload)
    assert saved.status_code == 200
    assert saved.json["outputs"] == ["application", "pitch-deck"]
    assert saved.json["exportNarrative"] == "Custom executive export body for review."

    audit1 = api(app, "POST", path + "/audits", first, {"version": saved.json["version"]})
    assert audit1.status_code == 201 and audit1.json["score"] == 100

    # Editing export narrative bumps revision and invalidates prior audit
    edited = {
        **payload,
        "version": saved.json["version"],
        "exportNarrative": "Refined narrative v2.",
    }
    resaved = api(app, "PATCH", path, first, edited)
    assert resaved.status_code == 200 and resaved.json["version"] == saved.json["version"] + 1
    assert api(app, "GET", path + "/audits", first).json[0]["current"] is False
    assert (
        api(
            app,
            "POST",
            path + "/export",
            first,
            {"version": resaved.json["version"], "format": "markdown"},
        ).status_code
        == 409
    )

    assert (
        api(app, "POST", path + "/audits", first, {"version": resaved.json["version"]}).status_code
        == 201
    )
    for fmt in ("markdown", "notebook", "word", "pdf"):
        resp = api(
            app,
            "POST",
            path + "/export",
            first,
            {"version": resaved.json["version"], "format": fmt},
        )
        assert resp.status_code == 200
        raw = b64decode(resp.json["base64"], validate=True)
        if fmt == "word":
            with ZipFile(BytesIO(raw)) as bundle:
                xml = bundle.read("word/document.xml")
                assert b"Refined narrative v2." in xml
                assert b"pitch-deck" in xml
        elif fmt == "pdf":
            assert raw.startswith(b"%PDF-")
        elif fmt == "notebook":
            nb_source = "".join(json.loads(raw)["cells"][0]["source"])
            assert "Refined narrative v2." in nb_source and "pitch-deck" in nb_source
        else:
            assert b"Refined narrative v2." in raw and b"pitch-deck" in raw


def test_given_workplan_tasks_when_roles_update_status_then_rbac_and_submission_lock_enforced(
    app, identities
):
    owner, peer = identities
    onboarding(app, owner)
    collaborator = onboarding(app, peer)
    workspace = project(app, owner)
    pid = workspace["id"]
    record = attempt(app, owner, pid, "Task RBAC Proposal")
    path = "/attempts/" + record["id"]

    api(
        app,
        "POST",
        f"/projects/{pid}/members",
        owner,
        {"accountId": collaborator["id"], "role": "viewer"},
    )
    assert api(app, "GET", path + "/tasks", peer).status_code == 200
    assert (
        api(app, "POST", path + "/tasks/budget", peer, {"status": "marked_done"}).status_code == 403
    )

    api(
        app,
        "POST",
        f"/projects/{pid}/members",
        owner,
        {"accountId": collaborator["id"], "role": "editor"},
    )
    assert (
        api(app, "POST", path + "/tasks/sections", peer, {"status": "verified"}).status_code == 422
    )
    assert (
        api(app, "POST", path + "/tasks/budget", peer, {"status": "marked_done"}).status_code == 403
    )

    saved = api(app, "PATCH", path, peer, authored(record)).json
    verified = api(app, "POST", path + "/tasks/sections", peer, {"status": "verified"})
    assert verified.status_code == 200
    assert next(t for t in verified.json if t["key"] == "sections")["status"] == "verified"

    api(
        app,
        "POST",
        f"/projects/{pid}/members",
        owner,
        {"accountId": collaborator["id"], "role": "reviewer"},
    )
    marked = api(app, "POST", path + "/tasks/export", peer, {"status": "marked_done"})
    assert marked.status_code == 200
    assert next(t for t in marked.json if t["key"] == "export")["status"] == "marked_done"
    reopened = api(app, "POST", path + "/tasks/export", peer, {"status": "open"})
    assert reopened.status_code == 200
    assert next(t for t in reopened.json if t["key"] == "export")["status"] == "open"

    ready = api(
        app, "POST", path + "/status", owner, {"version": saved["version"], "status": "ready"}
    ).json
    api(
        app,
        "POST",
        path + "/status",
        owner,
        {"version": ready["version"], "status": "submitted", "reference": "REC-123"},
    )
    assert (
        api(app, "POST", path + "/tasks/budget", owner, {"status": "marked_done"}).status_code
        == 409
    )


def test_given_bounty_draft_lifecycle_when_saved_edited_deleted_or_submitted_then_queue_stays_clean(
    app, identities
):
    author, reviewer = identities
    onboarding(app, author)
    onboarding(app, reviewer)
    update_account(reviewer["localId"], staff=True)

    for bad_url in (
        "https://127.0.0.1/grants",
        "https://localhost/grants",
        "https://intranet/grants",
        "https://funder.local/grants",
    ):
        resp = api(
            app,
            "POST",
            "/bounties",
            author,
            {
                "requestKey": str(uuid4()),
                "title": "Bad source",
                "url": bad_url,
                "note": "Should fail host validation.",
                "mode": "draft",
            },
        )
        assert resp.status_code == 422

    draft_req = {
        "requestKey": str(uuid4()),
        "title": "Draft Funder",
        "url": "https://example.org/draft-funder",
        "region": "Central Asia",
        "prizePool": "Not published",
        "mission": "Water infrastructure grants",
        "note": "Initial draft note.",
        "mode": "draft",
    }
    created = api(app, "POST", "/bounties", author, draft_req)
    assert created.status_code == 201 and created.json["status"] == "draft"
    assert not any(
        row["id"] == created.json["id"] for row in api(app, "GET", "/staff/bounties", reviewer).json
    )

    edited_draft = api(
        app,
        "PATCH",
        f"/bounties/{created.json['id']}",
        author,
        {
            "version": 1,
            "title": "Edited Draft Funder",
            "url": "https://example.org/draft-funder-v2",
            "region": "Global",
            "prizePool": "$100k",
            "mission": "Updated mission",
            "note": "Ready later.",
            "submit": False,
        },
    )
    assert edited_draft.status_code == 200 and edited_draft.json["status"] == "draft"

    throwaway = api(
        app,
        "POST",
        "/bounties",
        author,
        {**draft_req, "requestKey": str(uuid4()), "title": "Delete Me"},
    )
    assert throwaway.status_code == 201
    assert api(app, "DELETE", f"/bounties/{throwaway.json['id']}", author).status_code == 204

    submitted = api(
        app,
        "PATCH",
        f"/bounties/{created.json['id']}",
        author,
        {
            "version": 2,
            "title": "Submitted From Draft",
            "url": "https://example.org/draft-funder-v2",
            "region": "Global",
            "prizePool": "$100k",
            "mission": "Updated mission",
            "note": "Submitting now.",
            "submit": True,
        },
    )
    assert submitted.status_code == 200 and submitted.json["status"] == "pending"
    assert api(app, "DELETE", f"/bounties/{created.json['id']}", author).status_code == 409
    assert any(
        row["id"] == created.json["id"] for row in api(app, "GET", "/staff/bounties", reviewer).json
    )


def test_given_grants_catalog_when_filtering_by_region_and_category_then_exact_matches_return(app):
    filtered = api(app, "GET", "/grants?region=Central%20Asia&category=Community")
    assert filtered.status_code == 200
    assert [row["id"] for row in filtered.json] == ["2"]
    with app.test_client() as client:
        health = client.get("/healthz")
        assert health.headers["X-Frame-Options"] == "DENY"
        assert "frame-ancestors 'none'" in health.headers["Content-Security-Policy"]
        caps = client.get("/api/v1/capabilities").json
        assert caps["profileRevisions"] is True
        assert caps["workplanTasks"] is True
        assert caps["bountyDrafts"] is True
