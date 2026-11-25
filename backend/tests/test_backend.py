import json
import os
from base64 import b64decode
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
from uuid import uuid4
from zipfile import ZipFile

import psycopg
import pytest
import requests
from grantum_api import create_app
from grantum_api.config import Settings
from grantum_api.seed import seed
from sqlalchemy.engine import make_url


@pytest.fixture(scope="session")
def app():
    settings = Settings.from_env()
    assert settings.local and make_url(settings.database_url).database == "grantum_test"
    seed(settings)
    app = create_app(settings)
    app.config.update(TESTING=True)
    yield app
    app.extensions["grantum_engine"].dispose()


@pytest.fixture
def identities(app):
    class EmulatorIdentity(dict):
        def __repr__(self):
            return "EmulatorIdentity(<redacted>)"

    def create():
        nonce = uuid4().hex
        response = requests.post(
            "http://127.0.0.1:59099/identitytoolkit.googleapis.com/v1/accounts:signUp",
            params={"key": "demo-grantum-local"},
            json={"email": f"{nonce}@example.test", "password": nonce, "returnSecureToken": True},
            timeout=8,
        )
        assert response.ok, response.status_code
        return EmulatorIdentity(response.json())

    return create(), create()


def api(app, method, route, identity=None, payload=None):
    headers = {"Authorization": "Bearer " + identity["idToken"]} if identity is not None else {}
    with app.test_client() as client:
        return client.open("/api/v1" + route, method=method, headers=headers, json=payload)


def onboarding(app, identity):
    response = api(app, "POST", "/auth/session", identity)
    assert response.status_code == 200
    return response.json


def project(app, identity, name="Connected project"):
    result = api(app, "POST", "/projects", identity, {"name": name, "requestKey": str(uuid4())})
    assert result.status_code == 201
    return result.json


def attempt_input(project_id, title="Application"):
    return {"projectId": project_id, "grantId": "1", "requestKey": str(uuid4()), "title": title}


def attempt(app, identity, project_id, title="Application"):
    response = api(app, "POST", "/attempts", identity, attempt_input(project_id, title))
    assert response.status_code == 201
    return response.json


def authored(record):
    return {
        "version": record["version"],
        "title": record["title"],
        "sections": [
            {**section, "text": "Pilot, evidence, and key deliverables."}
            for section in record["sections"]
        ],
        "budget": [{"name": "Pilot", "amountMinor": 10000, "currency": "USD"}],
    }


def update_account(subject, *, staff=False, suspended=False):
    with psycopg.connect(os.environ["GRANTUM_MIGRATION_URL"].replace("+psycopg", "", 1)) as conn:
        conn.execute(
            "UPDATE accounts SET staff = %s, suspended = %s WHERE subject = %s",
            (staff, suspended, subject),
        )


def test_health_and_exact_cors(app):
    with app.test_client() as client:
        assert client.get("/healthz").status_code == 200
        assert client.get("/readyz").status_code == 200
        allowed = client.get("/api/v1/grants", headers={"Origin": "http://localhost:8081"})
        assert allowed.headers["Access-Control-Allow-Origin"] == "http://localhost:8081"
        assert allowed.headers["Cache-Control"] == "no-store"
        other = client.get("/api/v1/grants", headers={"Origin": "https://other.example"})
        assert "Access-Control-Allow-Origin" not in other.headers
        assert len(client.get("/api/v1/grants?q=resilience").json) == 1
        assert client.get("/api/v1/grants?q=%25").json == []


def test_verified_session_and_suspension(app, identities):
    first, _ = identities
    assert api(app, "GET", "/projects").status_code == 401
    assert api(app, "POST", "/auth/session", {"idToken": "faked"}).status_code == 401
    assert api(app, "GET", "/auth/me", first).status_code == 401
    account = onboarding(app, first)
    assert account == onboarding(app, first)
    assert api(app, "POST", "/auth/onboarding", first).json["isOnboarded"]
    settings = api(app, "PATCH", "/auth/me", first, {"displayName": "Test Applicant"})
    assert settings.json["displayName"] == "Test Applicant"
    update_account(first["localId"], suspended=True)
    assert api(app, "GET", "/projects", first).status_code == 403


def test_isolated_attempts_and_stale_edits(app, identities):
    first, second = identities
    onboarding(app, first)
    onboarding(app, second)
    workspace = project(app, first)
    a = attempt(app, first, workspace["id"], "First attempt")
    b = attempt(app, first, workspace["id"], "Second attempt")
    a_path, b_path = "/attempts/" + a["id"], "/attempts/" + b["id"]
    payload = authored(a)
    saved = api(app, "PATCH", a_path, first, payload)
    assert saved.status_code == 200 and saved.json["completionPct"] == 100
    assert api(app, "PATCH", a_path, first, payload).status_code == 409
    assert api(app, "GET", b_path, first).json["completionPct"] == 0
    assert api(app, "GET", a_path, second).status_code == 404
    assert api(app, "PATCH", a_path, second, payload).status_code == 404
    assert api(app, "GET", a_path + "/revisions", second).status_code == 404
    assert api(app, "GET", "/attempts", second).json == []
    assert api(app, "GET", "/dashboard/summary", first).json["activeDraft"]["attemptId"] == a["id"]


def test_idempotent_concurrent_attempt_creation(app, identities):
    first, _ = identities
    onboarding(app, first)
    workspace = project(app, first)
    payload = attempt_input(workspace["id"])
    with ThreadPoolExecutor(max_workers=2) as executor:
        a, b = executor.map(lambda _: api(app, "POST", "/attempts", first, payload), range(2))
    assert {a.status_code, b.status_code} == {200, 201}
    assert a.json["id"] == b.json["id"]
    assert len(api(app, "GET", "/attempts", first).json) == 1
    altered = {**payload, "title": "Changed request"}
    assert api(app, "POST", "/attempts", first, altered).status_code == 409


def test_team_permissions_and_revision_restore(app, identities):
    first, second = identities
    onboarding(app, first)
    collaborator = onboarding(app, second)
    workspace = project(app, first)
    team = f"/projects/{workspace['id']}/members"
    assert (
        api(
            app, "POST", team, first, {"accountId": collaborator["id"], "role": "viewer"}
        ).status_code
        == 200
    )
    record = attempt(app, first, workspace["id"])
    path = "/attempts/" + record["id"]
    assert api(app, "GET", path, second).status_code == 200
    assert api(app, "PATCH", path, second, authored(record)).status_code == 403
    assert (
        api(
            app, "POST", team, first, {"accountId": collaborator["id"], "role": "editor"}
        ).status_code
        == 200
    )
    saved = api(app, "PATCH", path, second, authored(record)).json
    restored = api(
        app, "POST", path + "/revisions/1/restore", second, {"version": saved["version"]}
    )
    assert restored.status_code == 200
    assert restored.json["completionPct"] == 0 and restored.json["version"] == 3
    assert api(app, "DELETE", team + "/" + collaborator["id"], first).status_code == 204
    assert api(app, "GET", path, second).status_code == 404


def test_audited_exports_and_revision_binding(app, identities):
    first, second = identities
    onboarding(app, first)
    onboarding(app, second)
    workspace = project(app, first)
    record = attempt(app, first, workspace["id"])
    path = "/attempts/" + record["id"]
    revision = api(app, "PATCH", path, first, authored(record)).json["version"]
    request = {"version": revision, "format": "markdown"}
    assert api(app, "POST", path + "/export", first, request).status_code == 409
    assert api(app, "POST", path + "/audits", first, {"version": revision}).json["score"] == 100
    assert api(app, "POST", path + "/export", second, request).status_code == 404
    for fmt in ("markdown", "notebook", "word", "pdf"):
        response = api(app, "POST", path + "/export", first, {**request, "format": fmt})
        assert response.status_code == 200
        raw = b64decode(response.json["base64"], validate=True)
        assert sha256(raw).hexdigest() == response.json["checksum"]
        if fmt == "notebook":
            assert json.loads(raw)["cells"][0]["cell_type"] == "markdown"
        elif fmt == "word":
            with ZipFile(BytesIO(raw)) as bundle:
                assert b"Pilot, evidence" in bundle.read("word/document.xml")
        elif fmt == "pdf":
            assert raw.startswith(b"%PDF-")
        else:
            assert b"# Application" in raw
    edited = {**authored(record), "version": revision, "title": "New revision"}
    next_revision = api(app, "PATCH", path, first, edited).json["version"]
    assert api(app, "GET", path + "/audits", first).json[0]["current"] is False
    assert (
        api(app, "POST", path + "/export", first, {**request, "version": next_revision}).status_code
        == 409
    )


def test_submission_receipts_are_immutable(app, identities):
    first, _ = identities
    onboarding(app, first)
    workspace = project(app, first)
    record = attempt(app, first, workspace["id"])
    path = "/attempts/" + record["id"]
    assert (
        api(app, "POST", path + "/status", first, {"version": 1, "status": "ready"}).status_code
        == 422
    )
    version = api(app, "PATCH", path, first, authored(record)).json["version"]
    ready = api(app, "POST", path + "/status", first, {"version": version, "status": "ready"}).json
    submitted = api(
        app,
        "POST",
        path + "/status",
        first,
        {
            "version": ready["version"],
            "status": "submitted",
            "reference": "Official receipt R-001",
        },
    )
    assert submitted.status_code == 200 and submitted.json["receipt"] == "Official receipt R-001"
    assert (
        api(
            app, "PATCH", path, first, {**authored(record), "version": submitted.json["version"]}
        ).status_code
        == 409
    )
    decision = {
        "version": submitted.json["version"],
        "status": "awarded",
        "reference": "Official award A-1",
    }
    assert api(app, "POST", path + "/status", first, decision).status_code == 403
    update_account(first["localId"], staff=True)
    assert api(app, "POST", path + "/status", first, decision).json["status"] == "awarded"


def test_project_text_document_limits_and_ownership(app, identities):
    first, second = identities
    onboarding(app, first)
    onboarding(app, second)
    workspace = project(app, first)
    path = f"/projects/{workspace['id']}/documents"
    assert (
        api(app, "POST", path, first, {"name": "../file.txt", "text": "evidence"}).status_code
        == 422
    )
    assert (
        api(app, "POST", path, first, {"name": "file.exe", "text": "evidence"}).status_code == 422
    )
    doc = api(app, "POST", path, first, {"name": "Evidence.txt", "text": "evidence"})
    assert doc.status_code == 201
    assert (
        api(app, "POST", path, first, {"name": "Evidence.txt", "text": "evidence"}).json["id"]
        == doc.json["id"]
    )
    assert api(app, "GET", path + "/" + doc.json["id"], second).status_code == 404
    assert api(app, "GET", path + "/" + doc.json["id"], first).json["text"] == "evidence"
    assert api(app, "DELETE", path + "/" + doc.json["id"], first).status_code == 204


def test_staff_review_and_private_notification(app, identities):
    first, reviewer = identities
    onboarding(app, first)
    onboarding(app, reviewer)
    request = {
        "requestKey": str(uuid4()),
        "title": "A new funder",
        "url": "https://example.org/grants",
        "note": "Public notice posted by the funder.",
    }
    submission = api(app, "POST", "/bounties", first, request)
    assert submission.status_code == 201
    assert api(app, "POST", "/bounties", first, request).json["id"] == submission.json["id"]
    assert api(app, "GET", "/staff/bounties", reviewer).status_code == 403
    update_account(reviewer["localId"], staff=True)
    review = f"/staff/bounties/{submission.json['id']}/review"
    assert (
        api(app, "POST", review, reviewer, {"status": "approved", "note": "Confirmed"}).status_code
        == 200
    )
    alert = api(app, "GET", "/notifications", first).json[0]
    notice = f"/notifications/{alert['id']}/read"
    assert api(app, "POST", notice, reviewer).status_code == 404
    assert api(app, "POST", notice, first).json["read"]


def test_postgres_runtime_privileges_and_production_token_guard(monkeypatch):
    url = os.environ["GRANTUM_DATABASE_URL"].replace("+psycopg", "", 1)
    with psycopg.connect(url) as conn:
        assert conn.execute("SELECT current_user").fetchone() == ("grantum_app",)
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            conn.execute("CREATE TABLE grantum_should_not_exist (id integer)")
    monkeypatch.setenv("GRANTUM_MODE", "production")
    monkeypatch.setenv("GRANTUM_FIREBASE_PROJECT", "real-grantum-project")
    with pytest.raises(RuntimeError, match="signed tokens"):
        Settings.from_env()


def test_posthog_consent_queue_sends_allowlisted_payload(app, identities):
    from dataclasses import replace
    from types import SimpleNamespace

    from grantum_api.analytics import deliver

    first, _ = identities
    account = onboarding(app, first)
    settings = {"displayName": "PII must never leave", "analyticsOptIn": True}
    assert api(app, "PATCH", "/auth/me", first, settings).status_code == 409
    app.config["POSTHOG_ENABLED"] = True
    sent = []

    def capture(url, **parameters):
        assert url == "https://us.i.posthog.com/i/v0/e/"
        item = parameters["json"]
        assert item["event"] == "attempt_created"
        assert item["properties"] == {"$process_person_profile": False, "$geoip_disable": True}
        assert item["distinct_id"] == account["id"]
        assert "PII must never leave" not in json.dumps(item)
        assert parameters["allow_redirects"] is False
        sent.append(item["uuid"])
        return SimpleNamespace(status_code=200)

    telemetry = replace(Settings.from_env(), posthog_key="fixture-key")
    try:
        workspace = project(app, first)
        attempt(app, first, workspace["id"])
        assert deliver(telemetry, send=capture) == 0
        assert api(app, "PATCH", "/auth/me", first, settings).json["analyticsOptIn"] is True
        attempt(app, first, workspace["id"])
        assert deliver(telemetry, send=capture) == 1
        assert deliver(telemetry, send=capture) == 0
        assert len(sent) == 1
        attempt(app, first, workspace["id"])
        opt_out = {**settings, "analyticsOptIn": False}
        assert api(app, "PATCH", "/auth/me", first, opt_out).json["analyticsOptIn"] is False
        assert deliver(telemetry, send=capture) == 0
    finally:
        app.config["POSTHOG_ENABLED"] = False


def test_create_project_idempotency_is_account_scoped(app, identities):
    first, second = identities
    onboarding(app, first)
    onboarding(app, second)
    payload = {"name": "Retryable project", "requestKey": str(uuid4())}
    initial = api(app, "POST", "/projects", first, payload)
    replay = api(app, "POST", "/projects", first, payload)
    assert (initial.status_code, replay.status_code) == (201, 200)
    assert initial.json["id"] == replay.json["id"]
    assert api(app, "POST", "/projects", first, {**payload, "name": "Another"}).status_code == 409
    second_result = api(app, "POST", "/projects", second, payload)
    assert second_result.status_code == 201 and second_result.json["id"] != initial.json["id"]


def test_status_change_rechecks_role_after_lock(app, identities):
    from time import monotonic, sleep

    owner, reviewer = identities
    onboarding(app, owner)
    collaborator = onboarding(app, reviewer)
    project_id = project(app, owner)["id"]
    member_path = f"/projects/{project_id}/members"
    api(app, "POST", member_path, owner, {"accountId": collaborator["id"], "role": "reviewer"})
    record = attempt(app, owner, project_id)
    attempt_path = "/attempts/" + record["id"]
    saved = api(app, "PATCH", attempt_path, owner, authored(record)).json
    request = {"version": saved["version"], "status": "ready"}
    migration_url = os.environ["GRANTUM_MIGRATION_URL"].replace("+psycopg", "", 1)
    with ThreadPoolExecutor(max_workers=1) as executor:
        with psycopg.connect(migration_url) as owner_db:
            owner_db.execute("SELECT id FROM projects WHERE id = %s FOR UPDATE", (project_id,))
            owner_db.execute(
                "UPDATE memberships SET role = 'viewer' WHERE project_id = %s AND account_id = %s",
                (project_id, collaborator["id"]),
            )
            pending = executor.submit(api, app, "POST", attempt_path + "/status", reviewer, request)
            end = monotonic() + 5
            waited = False
            with psycopg.connect(migration_url, autocommit=True) as observer:
                while monotonic() < end:
                    waited = observer.execute(
                        "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE usename = 'grantum_app'"
                        " AND %s = ANY (pg_blocking_pids(pid)))",
                        (owner_db.info.backend_pid,),
                    ).fetchone()[0]
                    if waited:
                        break
                    sleep(0.04)
            assert waited, "The update must reach the project lock before the demotion commits."
        assert pending.result(timeout=5).status_code == 403
    assert api(app, "GET", attempt_path, owner).json["status"] == "drafting"
