import json
from hashlib import sha256

from flask import Blueprint, abort, current_app, g, request
from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert

from .analytics import discard_pending
from .contracts import AccountSettings, MemberPayload, ProjectCreate, ProjectUpdate
from .models import Account, Membership, Opportunity, Project, new_id
from .requests import account, identifier, parse, project_access, require_version

routes = Blueprint("projects", __name__)


def account_view(actor):
    return {
        "id": actor.id,
        "displayName": actor.display_name,
        "staff": actor.staff,
        "isOnboarded": actor.onboarded,
        "status": "active",
        "analyticsOptIn": actor.analytics_opt_in,
        "analyticsAvailable": current_app.config["POSTHOG_ENABLED"],
    }


@routes.post("/auth/session")
def start_session():
    return account_view(account(create=True))


@routes.get("/auth/me")
def me():
    return account_view(account())


@routes.patch("/auth/me")
def save_settings():
    actor = account()
    payload = parse(AccountSettings)
    actor.display_name = payload.displayName
    if payload.analyticsOptIn is not None:
        if payload.analyticsOptIn and not current_app.config["POSTHOG_ENABLED"]:
            abort(409, "Usage analytics is unavailable.")
        actor.analytics_opt_in = payload.analyticsOptIn
        if not payload.analyticsOptIn:
            discard_pending(g.db, actor.id)
    return account_view(actor)


@routes.post("/auth/onboarding")
def finish_onboarding():
    actor = account()
    actor.onboarded = True
    return {"success": True, "isOnboarded": True}


def grant_view(grant, *, detail=False):
    result = {
        "id": grant.id,
        "title": grant.title,
        "funder": grant.funder,
        "deadline": grant.deadline,
        "amount": grant.amount,
        "region": grant.region,
        "summary": grant.summary,
        "matchPct": 0,
        "category": grant.category,
    }
    if detail:
        result["requirements"] = grant.requirements
    return result


@routes.get("/grants")
def grants():
    query = select(Opportunity)
    term = request.args.get("q", "").strip()[:120]
    if term:
        query = query.where(
            or_(
                Opportunity.title.icontains(term, autoescape=True),
                Opportunity.summary.icontains(term, autoescape=True),
                Opportunity.funder.icontains(term, autoescape=True),
            )
        )
    for field in ("region", "category"):
        values = request.args.getlist(field)[:10]
        if values:
            query = query.where(getattr(Opportunity, field).in_([value[:120] for value in values]))
    return [grant_view(row) for row in g.db.scalars(query.order_by(Opportunity.title).limit(100))]


@routes.get("/grants/<grant_id>")
def grant(grant_id):
    record = g.db.get(Opportunity, grant_id) if len(grant_id) <= 64 else None
    if not record:
        abort(404, "This opportunity is unavailable.")
    return grant_view(record, detail=True)


def project_view(project, role):
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "region": project.region,
        "legalEntity": project.legal_entity,
        "archived": project.archived,
        "version": project.version,
        "role": role,
    }


@routes.get("/projects")
def projects():
    actor = account()
    query = (
        select(Project, Membership.role)
        .join(Membership)
        .where(Membership.account_id == actor.id)
        .order_by(Project.name, Project.id)
        .limit(200)
    )
    return [project_view(project, role) for project, role in g.db.execute(query)]


@routes.post("/projects")
def create_project():
    actor = account()
    payload = parse(ProjectCreate)
    key = str(payload.requestKey)
    values = payload.model_dump(exclude={"requestKey"})
    checksum = sha256(json.dumps(values, sort_keys=True).encode()).hexdigest()
    project_id = g.db.scalar(
        insert(Project)
        .values(
            id=new_id(),
            name=payload.name,
            description=payload.description,
            region=payload.region,
            legal_entity=payload.legalEntity,
            creation_account_id=actor.id,
            creation_request_key=key,
            creation_hash=checksum,
        )
        .on_conflict_do_nothing(constraint="uq_project_request")
        .returning(Project.id)
    )
    if project_id:
        g.db.add(Membership(project_id=project_id, account_id=actor.id, role="owner"))
        return project_view(g.db.get(Project, project_id), "owner"), 201
    project = g.db.scalar(
        select(Project).where(
            Project.creation_account_id == actor.id, Project.creation_request_key == key
        )
    )
    if project.creation_hash != checksum:
        abort(409, "This request already created a project with different details.")
    return project_view(project, "owner")


@routes.patch("/projects/<project_id>")
def save_project(project_id):
    actor = account()
    payload = parse(ProjectUpdate)
    project, role = project_access(
        project_id, actor, roles={"owner", "editor"}, lock=True, allow_archived=True
    )
    require_version(project, payload.version)
    if (project.archived or payload.archived) and role != "owner":
        abort(403, "Only a project owner can archive or restore it.")
    values = {
        "name": payload.name,
        "description": payload.description,
        "region": payload.region,
        "legal_entity": payload.legalEntity,
        "archived": payload.archived,
    }
    if any(getattr(project, key) != value for key, value in values.items()):
        for key, value in values.items():
            setattr(project, key, value)
        project.version += 1
    return project_view(project, role)


@routes.get("/projects/<project_id>/members")
def members(project_id):
    project, _ = project_access(project_id, account())
    query = (
        select(Account.id, Account.display_name, Membership.role)
        .join(Membership)
        .where(Membership.project_id == project.id)
        .order_by(Account.display_name)
        .limit(200)
    )
    return [
        {"id": uid, "displayName": name, "role": role} for uid, name, role in g.db.execute(query)
    ]


@routes.post("/projects/<project_id>/members")
def add_member(project_id):
    actor = account()
    project, _ = project_access(project_id, actor, roles={"owner"}, lock=True)
    payload = parse(MemberPayload)
    member = g.db.get(Account, str(payload.accountId))
    if not member or member.suspended:
        abort(404, "This account is unavailable.")
    existing = g.db.get(Membership, (project.id, member.id))
    if existing and existing.role == "owner":
        abort(409, "Project ownership cannot be changed here.")
    g.db.execute(
        insert(Membership)
        .values(project_id=project.id, account_id=member.id, role=payload.role)
        .on_conflict_do_update(
            index_elements=[Membership.project_id, Membership.account_id],
            set_={"role": payload.role},
        )
    )
    return {"id": member.id, "displayName": member.display_name, "role": payload.role}


@routes.delete("/projects/<project_id>/members/<account_id>")
def remove_member(project_id, account_id):
    project, _ = project_access(project_id, account(), roles={"owner"}, lock=True)
    member = g.db.get(Membership, (project.id, identifier(account_id)))
    if not member:
        abort(404, "This membership is unavailable.")
    if member.role == "owner":
        abort(409, "Project ownership cannot be changed here.")
    g.db.delete(member)
    return "", 204
