import json
from base64 import b64encode
from hashlib import sha256
from io import BytesIO
from xml.sax.saxutils import escape

from docx import Document as WordDocument
from flask import Blueprint, abort, g
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from .analytics import record
from .attempts import EDIT
from .contracts import BountyPayload, BountyResubmission, BountyReview, ExportPayload, TextDocument
from .models import Audit, Bounty, Document, Notice, new_id
from .requests import (
    account,
    attempt_access,
    identifier,
    parse,
    project_access,
    require_version,
    staff,
)

routes = Blueprint("services", __name__)


def bounty_view(record):
    return {
        "id": record.id,
        "title": record.title,
        "url": record.url,
        "region": record.region,
        "prizePool": record.prize_pool,
        "mission": record.mission,
        "note": record.note,
        "status": record.status,
        "reviewNote": record.review_note,
        "version": record.version,
    }


def bounty_details_hash(title, url, note, region="", prize_pool="", mission=""):
    return sha256(
        json.dumps([title, url, note, region, prize_pool, mission]).encode("utf-8")
    ).hexdigest()


@routes.get("/bounties")
def bounties():
    actor = account()
    query = select(Bounty).where(Bounty.account_id == actor.id).order_by(Bounty.id).limit(100)
    return [bounty_view(record) for record in g.db.scalars(query)]


@routes.post("/bounties")
def submit_bounty():
    actor = account()
    payload = parse(BountyPayload)
    key = str(payload.requestKey)
    fingerprint = bounty_details_hash(
        payload.title, payload.url, payload.note, payload.region, payload.prizePool, payload.mission
    )
    status = "draft" if payload.mode == "draft" else "pending"
    inserted = g.db.scalar(
        insert(Bounty)
        .values(
            id=new_id(),
            account_id=actor.id,
            request_key=key,
            creation_hash=fingerprint,
            title=payload.title,
            url=payload.url,
            region=payload.region,
            prize_pool=payload.prizePool,
            mission=payload.mission,
            note=payload.note,
            status=status,
        )
        .on_conflict_do_nothing(constraint="uq_bounty_request")
        .returning(Bounty.id)
    )
    record = g.db.scalar(
        select(Bounty).where(Bounty.account_id == actor.id, Bounty.request_key == key)
    )
    existing = record.creation_hash or bounty_details_hash(
        record.title, record.url, record.note, record.region, record.prize_pool, record.mission
    )
    if existing != fingerprint:
        abort(409, "This request was already used for another bounty.")
    return bounty_view(record), 201 if inserted else 200


@routes.patch("/bounties/<bounty_id>")
def resubmit_bounty(bounty_id):
    actor = account()
    payload = parse(BountyResubmission)
    record = g.db.scalar(
        select(Bounty)
        .where(Bounty.id == identifier(bounty_id), Bounty.account_id == actor.id)
        .with_for_update()
    )
    if not record:
        abort(404, "This bounty is unavailable.")
    details = (
        payload.title,
        payload.url,
        payload.note,
        payload.region,
        payload.prizePool,
        payload.mission,
    )
    replay_statuses = {"pending"} if payload.submit else {"draft", "changes_requested"}
    if (
        record.version == payload.version + 1
        and record.status in replay_statuses
        and (
            record.title,
            record.url,
            record.note,
            record.region,
            record.prize_pool,
            record.mission,
        )
        == details
    ):
        return bounty_view(record)
    require_version(record, payload.version)
    if record.status not in {"draft", "changes_requested"}:
        abort(409, "Only saved drafts or sources with requested changes can be updated.")
    if record.creation_hash is None:
        record.creation_hash = bounty_details_hash(
            record.title, record.url, record.note, record.region, record.prize_pool, record.mission
        )
    (
        record.title,
        record.url,
        record.note,
        record.region,
        record.prize_pool,
        record.mission,
    ) = details
    if payload.submit:
        record.status = "pending"
    record.version += 1
    return bounty_view(record)


@routes.delete("/bounties/<bounty_id>")
def delete_bounty_draft(bounty_id):
    actor = account()
    record = g.db.scalar(
        select(Bounty)
        .where(Bounty.id == identifier(bounty_id), Bounty.account_id == actor.id)
        .with_for_update()
    )
    if not record:
        abort(404, "This bounty is unavailable.")
    if record.status != "draft":
        abort(409, "Only unsubmitted source drafts can be deleted.")
    g.db.delete(record)
    return "", 204


@routes.get("/staff/bounties")
def moderation_queue():
    staff()
    query = select(Bounty).where(Bounty.status == "pending").order_by(Bounty.id).limit(100)
    return [bounty_view(record) for record in g.db.scalars(query)]


@routes.post("/staff/bounties/<bounty_id>/review")
def review_bounty(bounty_id):
    actor = staff()
    payload = parse(BountyReview)
    record = g.db.scalar(select(Bounty).where(Bounty.id == identifier(bounty_id)).with_for_update())
    if not record:
        abort(404, "This bounty is unavailable.")
    if record.account_id == actor.id:
        abort(403, "Staff cannot review their own submission.")
    require_version(record, payload.version)
    if record.status != "pending":
        abort(409, "This bounty has already been reviewed.")
    record.status, record.review_note, record.reviewed_by = payload.status, payload.note, actor.id
    record.version += 1
    g.db.add(Notice(account_id=record.account_id, message="Your source submission was reviewed."))
    return bounty_view(record)


@routes.get("/notifications")
def notices():
    actor = account()
    query = (
        select(Notice)
        .where(Notice.account_id == actor.id)
        .order_by(Notice.created_at.desc())
        .limit(100)
    )
    return [
        {
            "id": notice.id,
            "message": notice.message,
            "read": notice.read,
            "createdAt": notice.created_at.isoformat(),
        }
        for notice in g.db.scalars(query)
    ]


@routes.post("/notifications/<notice_id>/read")
def acknowledge(notice_id):
    actor = account()
    notice = g.db.get(Notice, identifier(notice_id))
    if not notice or notice.account_id != actor.id:
        abort(404, "This notification is unavailable.")
    notice.read = True
    return {"read": True}


def document_view(row):
    return {"id": row.id, "name": row.name, "checksum": row.checksum, "size": len(row.content)}


@routes.get("/projects/<project_id>/documents")
def documents(project_id):
    project, _ = project_access(project_id, account())
    query = select(Document).where(Document.project_id == project.id).order_by(Document.name)
    return [document_view(row) for row in g.db.scalars(query)]


@routes.post("/projects/<project_id>/documents")
def upload(project_id):
    project, _ = project_access(project_id, account(), roles=EDIT, lock=True)
    payload = parse(TextDocument)
    content = payload.text.encode("utf-8")
    if len(content) > 100_000:
        abort(413, "Choose a text document below 100 KB.")
    checksum = sha256(content).hexdigest()
    query = select(Document).where(Document.project_id == project.id, Document.checksum == checksum)
    existing = g.db.scalar(query)
    if existing:
        return document_view(existing)
    count = g.db.scalar(select(func.count(Document.id)).where(Document.project_id == project.id))
    if count >= 30:
        abort(409, "This project has reached its 30-document limit.")
    row = Document(project_id=project.id, name=payload.name, checksum=checksum, content=content)
    g.db.add(row)
    g.db.flush()
    return document_view(row), 201


def document(project_id, document_id, *, editing=False):
    project, _ = project_access(
        project_id, account(), roles=EDIT if editing else None, lock=editing
    )
    row = g.db.get(Document, identifier(document_id))
    if not row or row.project_id != project.id:
        abort(404, "This document is unavailable.")
    return row


@routes.get("/projects/<project_id>/documents/<document_id>")
def get_document(project_id, document_id):
    row = document(project_id, document_id)
    return {**document_view(row), "text": row.content.decode("utf-8")}


@routes.delete("/projects/<project_id>/documents/<document_id>")
def delete_document(project_id, document_id):
    g.db.delete(document(project_id, document_id, editing=True))
    return "", 204


def clean_xml(value):
    return "".join(
        character
        for character in value
        if character in "\t\n\r"
        or 0x20 <= ord(character) <= 0xD7FF
        or 0xE000 <= ord(character) <= 0xFFFD
        or 0x10000 <= ord(character) <= 0x10FFFF
    )


def build_export(attempt, fmt):
    sections = [(section["name"], section["text"]) for section in attempt.sections]
    outputs_line = "Requested outputs: " + ", ".join(attempt.outputs or ["application"])
    custom = (attempt.export_narrative or "").strip()
    if custom:
        markdown = f"# {attempt.title}\n\n{outputs_line}\n\n{custom}"
    else:
        parts = [f"# {attempt.title}", outputs_line]
        parts.extend(f"## {title}\n\n{body}" for title, body in sections)
        if attempt.budget:
            budget_lines = "\n".join(
                f"- {line['name']}: {line['currency']} {line['amountMinor'] / 100:.2f}"
                for line in attempt.budget
            )
            parts.append(f"## Budget\n\n{budget_lines}")
        markdown = "\n\n".join(parts)
    if fmt == "markdown":
        return markdown.encode("utf-8"), "text/markdown", "md"
    if fmt == "notebook":
        result = {
            "nbformat": 4,
            "nbformat_minor": 5,
            "metadata": {},
            "cells": [
                {
                    "cell_type": "markdown",
                    "id": "grantum-proposal",
                    "metadata": {},
                    "source": markdown.splitlines(keepends=True),
                }
            ],
        }
        return (
            json.dumps(result, ensure_ascii=False).encode("utf-8"),
            "application/x-ipynb+json",
            "ipynb",
        )
    buffer = BytesIO()
    if fmt == "word":
        doc = WordDocument()
        doc.add_heading(clean_xml(attempt.title), level=0)
        doc.add_paragraph(clean_xml(outputs_line))
        if custom:
            doc.add_paragraph(clean_xml(custom))
        else:
            for title, body in sections:
                doc.add_heading(clean_xml(title), level=1)
                doc.add_paragraph(clean_xml(body))
            if attempt.budget:
                doc.add_heading("Budget", level=1)
                for line in attempt.budget:
                    doc.add_paragraph(
                        clean_xml(
                            f"{line['name']}: {line['currency']} {line['amountMinor'] / 100:.2f}"
                        )
                    )
        doc.save(buffer)
        return (
            buffer.getvalue(),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "docx",
        )
    styles = getSampleStyleSheet()
    story = [
        Paragraph(escape(clean_xml(attempt.title)), styles["Title"]),
        Paragraph(escape(clean_xml(outputs_line)), styles["BodyText"]),
        Spacer(1, 8),
    ]
    if custom:
        for line in clean_xml(custom).splitlines():
            if line.strip():
                story.append(Paragraph(escape(line), styles["BodyText"]))
    else:
        for title, body in sections:
            story.append(Paragraph(escape(clean_xml(title)), styles["Heading2"]))
            for line in clean_xml(body).splitlines():
                if line.strip():
                    story.append(Paragraph(escape(line), styles["BodyText"]))
            story.append(Spacer(1, 12))
        if attempt.budget:
            story.append(Paragraph("Budget", styles["Heading2"]))
            for line in attempt.budget:
                story.append(
                    Paragraph(
                        escape(
                            clean_xml(
                                f"{line['name']}: {line['currency']} {line['amountMinor'] / 100:.2f}"
                            )
                        ),
                        styles["BodyText"],
                    )
                )
    SimpleDocTemplate(buffer, title="Grantum application").build(story)
    return buffer.getvalue(), "application/pdf", "pdf"


@routes.post("/attempts/<attempt_id>/export")
def export_attempt(attempt_id):
    actor = account()
    attempt, _ = attempt_access(attempt_id, actor)
    payload = parse(ExportPayload)
    require_version(attempt, payload.version)
    audit = g.db.scalar(
        select(Audit).where(Audit.attempt_id == attempt.id, Audit.version == attempt.version)
    )
    if not audit or audit.score < 85:
        abort(
            409,
            "Run an audit on the current revision and complete at least 85% of required sections.",
        )
    data, mime, extension = build_export(attempt, payload.format)
    record(actor, "application_exported")
    return {
        "name": f"grantum-{attempt.id}-v{attempt.version}.{extension}",
        "mime": mime,
        "version": attempt.version,
        "checksum": sha256(data).hexdigest(),
        "base64": b64encode(data).decode("ascii"),
    }
