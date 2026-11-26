"""Operator commands confined to Grantum's local development services."""

from datetime import UTC, datetime
from getpass import getpass
from uuid import uuid4

import psycopg
import requests
from psycopg import sql

from manage import (
    API_PORT,
    AUTH_PORT,
    DATABASE,
    DB_ADMIN,
    DB_HOST,
    DB_PORT,
    LOCAL,
    MIGRATOR,
    environment,
    run,
    tool,
)


def create_local_user(settings, email, *, staff=False):
    if not email or not email.casefold().endswith("@example.test"):
        raise SystemExit("Use a test address ending in @example.test.")
    password = getpass("Test account password (minimum 12 characters): ")
    if len(password) < 12:
        raise SystemExit("Choose a test password with at least 12 characters.")
    try:
        result = requests.post(
            f"http://{DB_HOST}:{AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp",
            params={"key": "demo-grantum-local"},
            json={"email": email, "password": password, "returnSecureToken": True},
            timeout=8,
        )
        if not result.ok:
            raise SystemExit("The local auth emulator could not create that test account.")
        identity = result.json()
        if staff:
            session = requests.post(
                f"http://{DB_HOST}:{API_PORT}/api/v1/auth/session",
                headers={"Authorization": "Bearer " + identity["idToken"]},
                timeout=8,
            )
            if not session.ok:
                raise SystemExit(
                    "The test account exists. Start the local API before provisioning staff."
                )
            url = environment(settings)["GRANTUM_MIGRATION_URL"].replace("+psycopg", "", 1)
            with psycopg.connect(url, connect_timeout=4) as conn:
                conn.execute(
                    "UPDATE accounts SET staff = TRUE WHERE subject = %s", (identity["localId"],)
                )
    except requests.RequestException:
        raise SystemExit("Start the local Firebase Auth Emulator and try again.") from None
    print("Local test account created.", "Staff access enabled." if staff else "")


def backup(settings):
    directory = LOCAL / "backups"
    directory.mkdir(exist_ok=True)
    target = directory / (
        "grantum-" + datetime.now(UTC).strftime("%Y%m%dT%H%M%S") + "-" + uuid4().hex[:8] + ".dump"
    )
    temporary = target.with_suffix(".pending")
    try:
        run(
            [
                tool(settings, "pg_dump"),
                "-h",
                DB_HOST,
                "-p",
                str(DB_PORT),
                "-U",
                MIGRATOR,
                "-d",
                DATABASE,
                "--format=custom",
                "--file",
                str(temporary),
            ],
            env={**environment(settings), "PGPASSWORD": settings["migrator_password"]},
        )
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
    print("Created project-local backup:", target.name)
    return target


def test_restore(settings):
    source = backup(settings)
    database = "grantum_restore_check_" + uuid4().hex[:12]
    with psycopg.connect(
        dbname="postgres",
        user=DB_ADMIN,
        host=DB_HOST,
        port=DB_PORT,
        password=settings["admin_password"],
        autocommit=True,
        connect_timeout=5,
    ) as admin:
        admin.execute(
            sql.SQL("CREATE DATABASE {} OWNER {}").format(
                sql.Identifier(database),
                sql.Identifier(MIGRATOR),
            )
        )
        try:
            run(
                [
                    tool(settings, "pg_restore"),
                    "-h",
                    DB_HOST,
                    "-p",
                    str(DB_PORT),
                    "-U",
                    MIGRATOR,
                    "-d",
                    database,
                    "--no-owner",
                    "--exit-on-error",
                    str(source),
                ],
                env={**environment(settings), "PGPASSWORD": settings["migrator_password"]},
            )
            restored_url = environment(settings, database)["GRANTUM_MIGRATION_URL"]
            with psycopg.connect(
                restored_url.replace("+psycopg", "", 1), connect_timeout=4
            ) as conn:
                version = conn.execute("SELECT version_num FROM alembic_version").fetchone()[0]
                counts = [
                    conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
                    for table in ("opportunities", "projects", "attempts")
                ]
            print(
                "Restore passed. Revision:", version, "Opportunities, projects, attempts:", counts
            )
        finally:
            admin.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(database)))
