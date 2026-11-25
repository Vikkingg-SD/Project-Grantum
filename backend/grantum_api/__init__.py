from datetime import UTC, datetime
from uuid import uuid4

from flask import Flask, abort, g, jsonify, request
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import sessionmaker
from werkzeug.exceptions import HTTPException

from .auth import firebase_verifier
from .config import Settings


def create_app(settings=None, *, test_verifier=None):
    settings = settings or Settings.from_env()
    if test_verifier is not None and not settings.local:
        raise RuntimeError("Test identities require the isolated local configuration.")
    app = Flask(__name__)
    app.config.update(
        MAX_CONTENT_LENGTH=600_000,
        MAX_FORM_MEMORY_SIZE=100_000,
        POSTHOG_ENABLED=bool(settings.posthog_key),
    )
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=4,
        max_overflow=2,
        pool_timeout=5,
        connect_args={"connect_timeout": 5},
    )
    sessions = sessionmaker(engine, expire_on_commit=False)
    app.extensions["grantum_engine"] = engine
    app.extensions["grantum_verifier"] = test_verifier or firebase_verifier(settings)

    @app.before_request
    def open_request():
        g.request_id = uuid4().hex
        g.db = sessions()

    @app.after_request
    def finish_request(response):
        session = g.get("db")
        if session is not None and response.status_code < 400:
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                response = error(409, "The resource changed. Reload and try again.")
            except SQLAlchemyError:
                session.rollback()
                app.logger.error("Database commit failed for request %s", g.request_id)
                response = error(503, "The database is temporarily unavailable.")
        origin = request.headers.get("Origin")
        if origin in settings.allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
            response.vary.add("Origin")
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Request-Id"] = g.get("request_id", "")
        return response

    @app.teardown_request
    def close_request(_exc):
        session = g.pop("db", None)
        if session is not None:
            session.close()

    @app.errorhandler(HTTPException)
    def request_error(exception):
        return error(exception.code, exception.description)

    @app.errorhandler(SQLAlchemyError)
    def database_error(_exc):
        app.logger.error("Database operation failed for request %s", g.get("request_id"))
        return error(503, "The database is temporarily unavailable.")

    @app.get("/healthz")
    def live():
        return {"status": "ok"}

    @app.get("/readyz")
    def ready():
        revision = g.db.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        if revision != "0002":
            abort(503, "Apply Grantum's pending database migrations.")
        return {"status": "ready"}

    @app.get("/api/v1/capabilities")
    def capabilities():
        return {
            "mode": "local" if settings.local else "connected",
            "documents": ["txt", "md"],
            "exports": ["markdown", "notebook", "word", "pdf"],
            "notifications": ["in-app"],
            "manualFunderReceipts": True,
        }

    from .attempts import routes as attempt_routes
    from .projects import routes as project_routes
    from .services import routes as service_routes

    for blueprint in [project_routes, attempt_routes, service_routes]:
        app.register_blueprint(blueprint, url_prefix="/api/v1")
    return app


def error(status, message):
    response = jsonify(error={"message": message, "requestId": g.get("request_id")})
    response.status_code = status
    return response


def now():
    return datetime.now(UTC)
