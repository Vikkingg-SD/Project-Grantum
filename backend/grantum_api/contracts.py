from typing import Annotated, Literal
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Line = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Version = Annotated[int, Field(ge=1, le=2_147_483_647)]
Identifier = Annotated[
    str, StringConstraints(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
]


class Payload(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, str_strip_whitespace=True)


class AccountSettings(Payload):
    displayName: Title
    analyticsOptIn: bool | None = None


class ProjectPayload(Payload):
    name: Title
    description: str = Field(default="", max_length=8000)
    region: str = Field(default="", max_length=120)
    legalEntity: str = Field(default="", max_length=120)


class ProjectUpdate(ProjectPayload):
    version: Version
    archived: bool = False


class MemberPayload(Payload):
    accountId: UUID
    role: Literal["editor", "reviewer", "viewer"]


class AttemptPayload(Payload):
    projectId: UUID
    grantId: Identifier
    requestKey: UUID
    title: Title


class Section(Payload):
    name: Title
    text: str = Field(max_length=16000)


class BudgetLine(Payload):
    name: Title
    amountMinor: int = Field(ge=0, le=100_000_000_000)
    currency: Literal["USD", "EUR", "KZT", "GBP"]


class DraftUpdate(Payload):
    version: Version
    title: Title
    sections: list[Section] = Field(min_length=1, max_length=30)
    budget: list[BudgetLine] = Field(default_factory=list, max_length=35)

    @field_validator("sections")
    @classmethod
    def unique_section_names(cls, entries):
        if len({item.name.casefold() for item in entries}) != len(entries):
            raise ValueError("Section names must be unique.")
        return entries


class WorkTransition(Payload):
    version: Version
    status: Literal["drafting", "review", "ready", "submitted", "awarded", "declined"]
    reference: Line | None = None


class BountyPayload(Payload):
    requestKey: UUID
    title: Title
    url: str = Field(min_length=1, max_length=2048)
    note: Line

    @field_validator("url")
    @classmethod
    def validate_web_url(cls, value):
        url = urlsplit(value)
        if (
            url.scheme != "https"
            or not url.hostname
            or url.username
            or url.password
            or url.port not in (None, 443)
            or any(ch.isspace() or ch == "\\" for ch in value)
        ):
            raise ValueError("Enter an HTTPS source link.")
        return value


class BountyReview(Payload):
    status: Literal["approved", "rejected", "changes_requested"]
    note: Line


class TextDocument(Payload):
    name: Annotated[str, StringConstraints(pattern=r"^[a-zA-Z0-9 _.-]{1,110}\.(txt|md)$")]
    text: str = Field(min_length=1, max_length=100_000)

    @field_validator("text")
    @classmethod
    def no_control_characters(cls, value):
        if any(ord(char) < 32 and char not in "\n\r\t" for char in value):
            raise ValueError("Upload a plain UTF-8 text document.")
        return value


class VersionPayload(Payload):
    version: Version


class ExportPayload(VersionPayload):
    format: Literal["markdown", "notebook", "word", "pdf"]
