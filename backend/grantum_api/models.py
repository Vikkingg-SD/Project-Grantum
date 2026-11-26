from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def new_id():
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    subject: Mapped[str] = mapped_column(String(128), unique=True)
    display_name: Mapped[str] = mapped_column(String(120))
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    staff: Mapped[bool] = mapped_column(Boolean, default=False)
    analytics_opt_in: Mapped[bool] = mapped_column(Boolean, server_default="false")


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("creation_account_id", "creation_request_key", name="uq_project_request"),
    )

    creation_account_id: Mapped[str | None] = mapped_column(
        ForeignKey("accounts.id", name="fk_project_creation_account")
    )
    creation_request_key: Mapped[str | None] = mapped_column(String(36))
    creation_hash: Mapped[str | None] = mapped_column(String(64))

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text, default="")
    region: Mapped[str] = mapped_column(String(120), default="")
    legal_entity: Mapped[str] = mapped_column(String(120), default="")
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)


class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (CheckConstraint("role IN ('owner', 'editor', 'reviewer', 'viewer')"),)

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), primary_key=True)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), primary_key=True, index=True)
    role: Mapped[str] = mapped_column(String(12))


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(180))
    funder: Mapped[str] = mapped_column(String(120))
    deadline: Mapped[str] = mapped_column(String(48))
    amount: Mapped[str] = mapped_column(String(80))
    region: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(80))
    summary: Mapped[str] = mapped_column(Text)
    requirements: Mapped[list] = mapped_column(JSONB)


class Attempt(Base):
    __tablename__ = "attempts"
    __table_args__ = (
        UniqueConstraint("project_id", "request_key", name="uq_attempt_request"),
        CheckConstraint(
            "status IN ('drafting', 'review', 'ready', 'submitted', 'awarded', 'declined')"
        ),
        CheckConstraint("version >= 1"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    grant_id: Mapped[str] = mapped_column(ForeignKey("opportunities.id"))
    request_key: Mapped[str] = mapped_column(String(36))
    status: Mapped[str] = mapped_column(String(12), default="drafting")
    version: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String(120))
    sections: Mapped[list] = mapped_column(JSONB)
    budget: Mapped[list] = mapped_column(JSONB, default=list)
    receipt: Mapped[str | None] = mapped_column(String(500))
    decision_reference: Mapped[str | None] = mapped_column(String(500))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Revision(Base):
    __tablename__ = "attempt_revisions"

    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"))
    snapshot: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Audit(Base):
    __tablename__ = "attempt_audits"
    __table_args__ = (
        UniqueConstraint("attempt_id", "version", name="uq_audit_revision"),
        CheckConstraint("score BETWEEN 0 AND 100"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    attempt_id: Mapped[str] = mapped_column(ForeignKey("attempts.id"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    score: Mapped[int] = mapped_column(Integer)
    missing: Mapped[list] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Bounty(Base):
    __tablename__ = "bounties"
    __table_args__ = (
        UniqueConstraint("account_id", "request_key", name="uq_bounty_request"),
        CheckConstraint("status IN ('pending', 'approved', 'rejected', 'changes_requested')"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    request_key: Mapped[str] = mapped_column(String(36))
    title: Mapped[str] = mapped_column(String(180))
    url: Mapped[str] = mapped_column(String(2048))
    note: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[str | None] = mapped_column(ForeignKey("accounts.id"))
    review_note: Mapped[str | None] = mapped_column(String(500))
    version: Mapped[int] = mapped_column(Integer, server_default="1")


class Notice(Base):
    __tablename__ = "notices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    message: Mapped[str] = mapped_column(String(300))
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Document(Base):
    __tablename__ = "project_documents"
    __table_args__ = (UniqueConstraint("project_id", "checksum", name="uq_document_checksum"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    checksum: Mapped[str] = mapped_column(String(64))
    content: Mapped[bytes] = mapped_column(LargeBinary)


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"
    __table_args__ = (CheckConstraint("event IN ('attempt_created', 'application_exported')"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    account_id: Mapped[str] = mapped_column(ForeignKey("accounts.id"), index=True)
    event: Mapped[str] = mapped_column(String(40))
    failures: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    next_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
