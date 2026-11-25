from uuid import UUID

from flask import abort, current_app, g, request
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from .auth import request_identity
from .models import Account, Attempt, Membership, Project, new_id


def parse(model):
    if not request.is_json:
        abort(415, "Send a JSON request.")
    try:
        return model.model_validate_json(request.get_data())
    except ValidationError:
        abort(422, "Check the required fields, sizes, and allowed values.")


def account(*, create=False):
    identity = request_identity(current_app.extensions["grantum_verifier"])
    if create:
        g.db.execute(
            insert(Account)
            .values(id=new_id(), subject=identity.subject, display_name=identity.name)
            .on_conflict_do_nothing(index_elements=[Account.subject])
        )
    actor = g.db.scalar(select(Account).where(Account.subject == identity.subject))
    if not actor:
        abort(401, "Start a Grantum session first.")
    if actor.suspended:
        abort(403, "This Grantum account is suspended.")
    return actor


def staff():
    actor = account()
    if not actor.staff:
        abort(403, "This action requires a staff account.")
    return actor


def identifier(raw):
    try:
        return str(UUID(raw))
    except ValueError:
        abort(404, "This resource is unavailable.")


def project_access(raw, actor, *, roles=None, lock=False, allow_archived=False):
    project_id = identifier(raw)
    query = (
        select(Project, Membership.role)
        .join(Membership, Membership.project_id == Project.id)
        .where(Project.id == project_id, Membership.account_id == actor.id)
    )
    if lock:
        query = query.with_for_update(of=Project)
    row = g.db.execute(query).one_or_none()
    if not row:
        abort(404, "This project is unavailable.")
    project, role = row
    if lock:
        role = g.db.scalar(
            select(Membership.role).where(
                Membership.project_id == project.id, Membership.account_id == actor.id
            )
        )
        if role is None:
            abort(404, "This project is unavailable.")
    if roles is not None and role not in roles:
        abort(403, "Your project role cannot make this change.")
    if lock and project.archived and not allow_archived:
        abort(409, "Restore this project before editing it.")
    return project, role


def attempt_access(raw, actor, *, roles=None, lock=False):
    attempt_id = identifier(raw)
    row = g.db.execute(
        select(Attempt, Membership.role)
        .join(Membership, Membership.project_id == Attempt.project_id)
        .where(Attempt.id == attempt_id, Membership.account_id == actor.id)
    ).one_or_none()
    if not row:
        abort(404, "This application attempt is unavailable.")
    attempt, role = row
    if roles is not None and role not in roles:
        abort(403, "Your project role cannot make this change.")
    if lock:
        project_access(attempt.project_id, actor, roles=roles, lock=True)
        g.db.refresh(attempt, with_for_update=True)
    return attempt, role


def require_version(row, expected):
    if row.version != expected:
        abort(409, "Someone changed this record. Reload before saving again.")
