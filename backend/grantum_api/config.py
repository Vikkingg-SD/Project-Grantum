from dataclasses import dataclass
from os import environ
from urllib.parse import urlsplit

from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

DEMO_PROJECT = "demo-grantum-local"
LOCAL_AUTH = "127.0.0.1:59099"


@dataclass(frozen=True)
class Settings:
    database_url: str
    firebase_project: str
    local: bool
    allowed_origins: frozenset[str]
    posthog_key: str = ""
    posthog_origin: str = "https://us.i.posthog.com"

    @classmethod
    def from_env(cls):
        mode = environ.get("GRANTUM_MODE", "production")
        if mode not in {"local", "production"}:
            raise RuntimeError("GRANTUM_MODE must be local or production.")
        database = environ.get("GRANTUM_DATABASE_URL", "")
        try:
            url = make_url(database)
        except ArgumentError as error:
            raise RuntimeError("Configure the Grantum database URL.") from error
        if url.drivername != "postgresql+psycopg":
            raise RuntimeError("Grantum requires PostgreSQL and psycopg.")
        project = environ.get("GRANTUM_FIREBASE_PROJECT", "")
        emulator = environ.get("FIREBASE_AUTH_EMULATOR_HOST")
        local = mode == "local"
        if local:
            if (
                project != DEMO_PROJECT
                or emulator != LOCAL_AUTH
                or (url.host, url.port) != ("127.0.0.1", 55432)
            ):
                raise RuntimeError("Local mode requires Grantum's private demo services.")
        elif not project or project.startswith("demo-") or emulator is not None:
            raise RuntimeError("Production requires a real Firebase project and signed tokens.")
        origins = frozenset(
            value.strip()
            for value in environ.get("GRANTUM_ALLOWED_ORIGINS", "").split(",")
            if value.strip()
        )
        for origin in origins:
            parsed = urlsplit(origin)
            valid_local = (
                local and parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}
            )
            if (
                not parsed.netloc
                or parsed.username is not None
                or parsed.path
                or parsed.query
                or parsed.fragment
                or (parsed.scheme != "https" and not valid_local)
            ):
                raise RuntimeError("Allowed origins must be exact HTTPS origins or local origins.")
        posthog_key = environ.get("GRANTUM_POSTHOG_KEY", "")
        posthog_origin = environ.get("GRANTUM_POSTHOG_ORIGIN", "https://us.i.posthog.com")
        if posthog_origin not in {"https://us.i.posthog.com", "https://eu.i.posthog.com"}:
            raise RuntimeError("Choose a supported PostHog ingestion origin.")
        return cls(database, project, local, origins, posthog_key, posthog_origin)
