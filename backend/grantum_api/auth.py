from collections.abc import Callable
from dataclasses import dataclass

import firebase_admin
from firebase_admin import auth, credentials, exceptions
from flask import abort, request

from .config import Settings


@dataclass(frozen=True)
class Identity:
    subject: str
    name: str


class EmulatorCredential(credentials.Base):
    def get_credential(self):
        from google.auth.credentials import AnonymousCredentials

        return AnonymousCredentials()


def firebase_verifier(settings: Settings) -> Callable[[str], Identity]:
    name = "grantum-" + settings.firebase_project
    try:
        firebase_app = firebase_admin.get_app(name)
    except ValueError:
        firebase_app = firebase_admin.initialize_app(
            EmulatorCredential() if settings.local else credentials.ApplicationDefault(),
            {"projectId": settings.firebase_project},
            name=name,
        )

    def verify(token: str) -> Identity:
        try:
            claims = auth.verify_id_token(token, app=firebase_app, check_revoked=True)
        except (
            auth.InvalidIdTokenError,
            auth.ExpiredIdTokenError,
            auth.RevokedIdTokenError,
            auth.UserDisabledError,
            ValueError,
        ):
            abort(401, "Sign in again to continue.")
        except exceptions.FirebaseError:
            abort(503, "The identity service is temporarily unavailable.")
        subject = claims.get("uid")
        if not isinstance(subject, str) or not 1 <= len(subject) <= 128:
            abort(401, "The session is invalid.")
        display_name = claims.get("name")
        return Identity(subject, str(display_name or "Grantum member")[:120])

    return verify


def request_identity(verifier: Callable[[str], Identity]) -> Identity:
    scheme, separator, token = request.headers.get("Authorization", "").partition(" ")
    if not separator or scheme.lower() != "bearer" or not 1 <= len(token) <= 8192:
        abort(401, "Sign in to continue.")
    return verifier(token)
