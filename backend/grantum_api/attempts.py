from datetime import UTC, datetime

from flask import Blueprint, abort, g
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from .analytics import record
from .contracts import AttemptPayload, DraftUpdate, TaskUpdate, VersionPayload, WorkTransition
from .models import (
    Account,
    Attempt,
    AttemptTask,
    Audit,
    Membership,
    Notice,
    Opportunity,
    ProjectRevision,
    Revision,
    new_id,
)
from .requests import account, attempt_access, parse, project_access, require_version, staff

routes = Blueprint("attempts", __name__)
EDIT = {"owner", "editor"}
REVIEW = {"owner", "reviewer"}
WORKING = {"drafting", "review"}
LOCKED_STATUSES = {"submitted", "awarded", "declined"}
WORKPLAN_TASKS = (
    ("sections", "Complete required sections", "Drafting"),
    ("audit", "Run audit on current revision", "Audit"),
    ("budget", "Review itemized budget lines", "Budget"),
    ("export", "Verify export bundle readiness", "Export"),
    ("submission", "Record official submission receipt", "Progress Tracking"),
)
WORKPLAN_MAP = {key: (title, tab) for key, title, tab in WORKPLAN_TASKS}


def draft_snapshot(attempt):
    return {
        "title": attempt.title,
        "sections": attempt.sections,
        "budget": attempt.budget,
        "outputs": attempt.outputs or ["application"],
        "exportNarrative": attempt.export_narrative or "",
        "profileVersion": attempt.profile_version,
        "status": attempt.status,
        "receipt": attempt.receipt,
        "decisionReference": attempt.decision_reference,
    }


def attempt_view(attempt, grant, role):
    completed = {
        section["name"].casefold() for section in attempt.sections if section["text"].strip()
    }
    required = grant.requirements
    done = sum(name.casefold() in completed for name in required)
    return {
        "id": attempt.id,
        "projectId": attempt.project_id,
        "grantId": attempt.grant_id,
        "grantTitle": grant.title,
        "role": role,
        "version": attempt.version,
        "requirements": required,
        "completionPct": round(100 * done / len(required)) if required else 0,
        "updatedAt": attempt.updated_at.isoformat(),
        **draft_snapshot(attempt),
    }


def write_revision(attempt, actor):
    attempt.updated_at = datetime.now(UTC)
    g.db.add(
        Revision(
            attempt_id=attempt.id,
            version=attempt.version,
            actor_id=actor.id,
            snapshot=draft_snapshot(attempt),
        )
    )


@routes.get("/attempts")
def attempts():
    actor = account()
    query = (
        select(Attempt, Opportunity, Membership.role)
        .join(Opportunity, Opportunity.id == Attempt.grant_id)
        .join(Membership, Membership.project_id == Attempt.project_id)
        .where(Membership.account_id == actor.id)
        .order_by(Attempt.updated_at.desc(), Attempt.id)
        .limit(100)
    )
    return [attempt_view(attempt, grant, role) for attempt, grant, role in g.db.execute(query)]


@routes.post("/attempts")
def create_attempt():
    actor = account()
    body = parse(AttemptPayload)
    project, role = project_access(str(body.projectId), actor, roles=EDIT, lock=True)
    grant = g.db.get(Opportunity, body.grantId)
    if not grant:
        abort(404, "This opportunity is unavailable.")
    attempt_id = g.db.scalar(
        insert(Attempt)
        .values(
            id=new_id(),
            project_id=project.id,
            grant_id=grant.id,
            request_key=str(body.requestKey),
            profile_version=project.version,
            title=body.title,
            sections=[{"name": name, "text": ""} for name in grant.requirements],
            outputs=["application"],
            export_narrative="",
        )
        .on_conflict_do_nothing(constraint="uq_attempt_request")
        .returning(Attempt.id)
    )
    if attempt_id:
        attempt = g.db.get(Attempt, attempt_id)
        write_revision(attempt, actor)
        record(actor, "attempt_created")
        return attempt_view(attempt, grant, role), 201
    attempt = g.db.scalar(
        select(Attempt).where(
            Attempt.project_id == project.id, Attempt.request_key == str(body.requestKey)
        )
    )
    first = g.db.get(Revision, (attempt.id, 1))
    if attempt.grant_id != grant.id or first.snapshot["title"] != body.title:
        abort(409, "This request was already used for a different attempt.")
    return attempt_view(attempt, grant, role)


@routes.get("/attempts/<attempt_id>")
def attempt_detail(attempt_id):
    attempt, role = attempt_access(attempt_id, account())
    return attempt_view(attempt, g.db.get(Opportunity, attempt.grant_id), role)


@routes.patch("/attempts/<attempt_id>")
def save_attempt(attempt_id):
    actor = account()
    attempt, role = attempt_access(attempt_id, actor, roles=EDIT, lock=True)
    payload = parse(DraftUpdate)
    require_version(attempt, payload.version)
    if attempt.status not in WORKING:
        abort(409, "Reopen the attempt before editing it.")
    grant = g.db.get(Opportunity, attempt.grant_id)
    names = {entry.name.casefold() for entry in payload.sections}
    if any(name.casefold() not in names for name in grant.requirements):
        abort(422, "Keep the required opportunity sections in this attempt.")
    if payload.profileVersion is not None and not g.db.get(
        ProjectRevision, (attempt.project_id, payload.profileVersion)
    ):
        abort(422, "Select an existing project profile revision.")
    changes = {
        "title": payload.title,
        "sections": [item.model_dump() for item in payload.sections],
        "budget": [item.model_dump() for item in payload.budget],
        "outputs": list(payload.outputs),
        "export_narrative": payload.exportNarrative,
        "profile_version": (
            payload.profileVersion
            if payload.profileVersion is not None
            else attempt.profile_version
        ),
    }
    if any(getattr(attempt, key) != value for key, value in changes.items()):
        for key, value in changes.items():
            setattr(attempt, key, value)
        attempt.version += 1
        write_revision(attempt, actor)
    return attempt_view(attempt, grant, role)


@routes.get("/attempts/<attempt_id>/revisions")
def revisions(attempt_id):
    attempt, _ = attempt_access(attempt_id, account())
    entries = g.db.scalars(
        select(Revision)
        .where(Revision.attempt_id == attempt.id)
        .order_by(Revision.version.desc())
        .limit(100)
    )
    return [
        {
            "version": entry.version,
            "createdAt": entry.created_at.isoformat(),
            "status": entry.snapshot["status"],
        }
        for entry in entries
    ]


@routes.post("/attempts/<attempt_id>/revisions/<int:version>/restore")
def restore_revision(attempt_id, version):
    actor = account()
    attempt, role = attempt_access(attempt_id, actor, roles=EDIT, lock=True)
    require_version(attempt, parse(VersionPayload).version)
    if attempt.status not in WORKING:
        abort(409, "Reopen the attempt before restoring a revision.")
    if not 1 <= version <= attempt.version:
        abort(404, "This revision is unavailable.")
    entry = g.db.get(Revision, (attempt.id, version))
    if not entry:
        abort(404, "This revision is unavailable.")
    for key in ["title", "sections", "budget"]:
        setattr(attempt, key, entry.snapshot[key])
    attempt.outputs = entry.snapshot.get("outputs") or ["application"]
    attempt.export_narrative = entry.snapshot.get("exportNarrative", "")
    if entry.snapshot.get("profileVersion") is not None:
        attempt.profile_version = entry.snapshot["profileVersion"]
    attempt.version += 1
    write_revision(attempt, actor)
    return attempt_view(attempt, g.db.get(Opportunity, attempt.grant_id), role)


def audit_view(audit, version):
    return {
        "id": audit.id,
        "version": audit.version,
        "score": audit.score,
        "missing": audit.missing,
        "current": audit.version == version,
        "createdAt": audit.created_at.isoformat(),
    }


@routes.get("/attempts/<attempt_id>/audits")
def audits(attempt_id):
    attempt, _ = attempt_access(attempt_id, account())
    entries = g.db.scalars(
        select(Audit)
        .where(Audit.attempt_id == attempt.id)
        .order_by(Audit.version.desc())
        .limit(100)
    )
    return [audit_view(entry, attempt.version) for entry in entries]


@routes.post("/attempts/<attempt_id>/audits")
def run_audit(attempt_id):
    actor = account()
    attempt, _ = attempt_access(attempt_id, actor, roles=EDIT | REVIEW, lock=True)
    require_version(attempt, parse(VersionPayload).version)
    entry = g.db.scalar(
        select(Audit).where(Audit.attempt_id == attempt.id, Audit.version == attempt.version)
    )
    if entry:
        return audit_view(entry, attempt.version)
    grant = g.db.get(Opportunity, attempt.grant_id)
    authored = {
        section["name"].casefold() for section in attempt.sections if section["text"].strip()
    }
    missing = [name for name in grant.requirements if name.casefold() not in authored]
    score = (
        100
        if not grant.requirements
        else round(100 * (len(grant.requirements) - len(missing)) / len(grant.requirements))
    )
    entry = Audit(attempt_id=attempt.id, version=attempt.version, score=score, missing=missing)
    g.db.add(entry)
    g.db.flush()
    return audit_view(entry, attempt.version), 201


def task_auto_completion(attempt, grant):
    completed = {
        section["name"].casefold() for section in attempt.sections if section["text"].strip()
    }
    required = grant.requirements
    sections_pct = (
        round(100 * sum(n.casefold() in completed for n in required) / len(required))
        if required
        else 100
    )
    audit = g.db.scalar(
        select(Audit).where(Audit.attempt_id == attempt.id, Audit.version == attempt.version)
    )
    audit_pct = 100 if audit and audit.score >= 85 else (audit.score if audit else 0)
    return {
        "sections": sections_pct,
        "audit": audit_pct,
        "budget": 100 if attempt.budget else 0,
        "export": 100 if audit and audit.score >= 85 else 0,
        "submission": 100 if attempt.status in LOCKED_STATUSES else 0,
    }


def build_workplan_tasks(attempt, grant):
    auto_pcts = task_auto_completion(attempt, grant)
    rows = g.db.execute(
        select(AttemptTask, Account.display_name)
        .join(Account, Account.id == AttemptTask.updated_by)
        .where(AttemptTask.attempt_id == attempt.id)
    ).all()
    saved = {task.task_key: (task, actor_name) for task, actor_name in rows}
    items = []
    for key, title, target_tab in WORKPLAN_TASKS:
        entry = saved.get(key)
        task, actor_name = entry if entry else (None, None)
        items.append(
            {
                "key": key,
                "title": title,
                "targetTab": target_tab,
                "autoCompletionPct": auto_pcts[key],
                "status": task.status if task else "open",
                "updatedBy": actor_name,
                "updatedByRole": task.updated_by_role if task else None,
                "updatedAt": task.updated_at.isoformat() if task else None,
            }
        )
    return items


@routes.get("/attempts/<attempt_id>/tasks")
def list_tasks(attempt_id):
    attempt, _ = attempt_access(attempt_id, account())
    return build_workplan_tasks(attempt, g.db.get(Opportunity, attempt.grant_id))


@routes.post("/attempts/<attempt_id>/tasks/<task_key>")
def update_task(attempt_id, task_key):
    if task_key not in WORKPLAN_MAP:
        abort(404, "This workplan item is unavailable.")
    actor = account()
    attempt, role = attempt_access(attempt_id, actor, lock=True)
    if attempt.status in LOCKED_STATUSES:
        abort(409, "Submitted applications have locked workplan tasks.")
    payload = parse(TaskUpdate)
    if payload.status == "verified":
        if role not in (EDIT | REVIEW):
            abort(403, "Your project role cannot verify workplan tasks.")
        grant = g.db.get(Opportunity, attempt.grant_id)
        if task_auto_completion(attempt, grant)[task_key] != 100:
            abort(422, "Complete this item to 100% before verifying it.")
    else:
        if role not in REVIEW:
            abort(
                403, "Only project owners and reviewers can manually mark or reopen workplan tasks."
            )
        grant = g.db.get(Opportunity, attempt.grant_id)
    now = datetime.now(UTC)
    g.db.execute(
        insert(AttemptTask)
        .values(
            attempt_id=attempt.id,
            task_key=task_key,
            status=payload.status,
            updated_by=actor.id,
            updated_by_role=role,
            updated_at=now,
        )
        .on_conflict_do_update(
            index_elements=[AttemptTask.attempt_id, AttemptTask.task_key],
            set_={
                "status": payload.status,
                "updated_by": actor.id,
                "updated_by_role": role,
                "updated_at": now,
            },
        )
    )
    g.db.flush()
    return build_workplan_tasks(attempt, grant)


@routes.post("/attempts/<attempt_id>/status")
def update_status(attempt_id):
    payload = parse(WorkTransition)
    actor = staff() if payload.status in {"awarded", "declined"} else account()
    attempt, role = attempt_access(attempt_id, actor, lock=True)
    require_version(attempt, payload.version)
    grant = g.db.get(Opportunity, attempt.grant_id)
    old, new = attempt.status, payload.status
    permitted = {
        ("drafting", "review"): EDIT,
        ("drafting", "ready"): REVIEW,
        ("review", "ready"): REVIEW,
        ("review", "drafting"): REVIEW,
        ("ready", "drafting"): REVIEW,
        ("ready", "submitted"): {"owner"},
        ("submitted", "awarded"): REVIEW,
        ("submitted", "declined"): REVIEW,
    }.get((old, new), set())
    if not permitted:
        abort(409, "This application cannot move to that status.")
    if role not in permitted:
        abort(403, "Your project role cannot change this status.")
    if new == "ready" and attempt_view(attempt, grant, role)["completionPct"] != 100:
        abort(422, "Write all required sections before marking this attempt ready.")
    if new in {"submitted", "awarded", "declined"}:
        if not payload.reference:
            abort(422, "Record the official funder reference for this update.")
        if new == "submitted":
            attempt.receipt = payload.reference
        else:
            attempt.decision_reference = payload.reference
        members = g.db.scalars(
            select(Membership.account_id).where(Membership.project_id == attempt.project_id)
        ).all()
        for recipient in members:
            g.db.add(Notice(account_id=recipient, message=f"An application was recorded as {new}."))
    attempt.status = new
    attempt.version += 1
    write_revision(attempt, actor)
    return attempt_view(attempt, grant, role)


@routes.get("/dashboard/summary")
def dashboard():
    actor = account()
    query = (
        select(Attempt, Opportunity, Membership.role)
        .join(Opportunity, Opportunity.id == Attempt.grant_id)
        .join(Membership, Membership.project_id == Attempt.project_id)
        .where(Membership.account_id == actor.id)
        .order_by(Attempt.updated_at.desc())
        .limit(100)
    )
    items = [attempt_view(attempt, grant, role) for attempt, grant, role in g.db.execute(query)]
    counts = {}
    for item in items:
        counts[item["status"]] = counts.get(item["status"], 0) + 1
    active = next((item for item in items if item["status"] in WORKING), None)
    return {
        "greetingName": actor.display_name,
        "pipeline": [{"label": status, "count": count} for status, count in counts.items()],
        "profileCompletionPct": 100 if actor.onboarded else 0,
        "activeDraft": (
            {
                "grantId": active["grantId"],
                "attemptId": active["id"],
                "title": active["title"],
                "completionPct": active["completionPct"],
            }
            if active
            else None
        ),
    }
