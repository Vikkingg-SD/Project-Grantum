"""Operate Grantum's private Windows development services."""

import argparse
import json
import os
import secrets
import subprocess
import sys
from pathlib import Path

import psycopg
from psycopg import sql
from sqlalchemy.engine import URL

ROOT = Path(__file__).resolve().parent
LOCAL = ROOT / ".local"
DATA = LOCAL / "postgres"
CONFIG = LOCAL / "settings.json"
DB_HOST = "127.0.0.1"
DB_PORT = 55432
AUTH_PORT = 59099
API_PORT = 5050
DB_ADMIN = "grantum_local_admin"
MIGRATOR = "grantum_migrator"
APP = "grantum_app"
DATABASE = "grantum"
TEST_DATABASE = "grantum_test"


def run(args, *, check=True, env=None):
    return subprocess.run(args, cwd=ROOT, check=check, env=env)


def load():
    if not CONFIG.is_file():
        raise SystemExit("Run the Grantum setup command first.")
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def tool(settings, name):
    return str(Path(settings["postgres_bin"]) / f"{name}.exe")


def private_dir():
    LOCAL.mkdir(mode=0o700, exist_ok=True)
    if os.name != "nt":
        LOCAL.chmod(0o700)
        return
    identity = subprocess.check_output(["whoami"], text=True).strip()
    run(["icacls", str(LOCAL), "/inheritance:r", "/grant:r", f"{identity}:(OI)(CI)F"])


def pg_control(settings, *args, check=True):
    return run([tool(settings, "pg_ctl"), "-D", str(DATA), *args], check=check)


def start(settings):
    if pg_control(settings, "status", check=False).returncode != 0:
        pg_control(
            settings,
            "start",
            "-w",
            "-t",
            "30",
            "-l",
            str(LOCAL / "postgres.log"),
            "-o",
            f"-h {DB_HOST} -p {DB_PORT}",
        )


def configure_database(settings):
    with psycopg.connect(
        dbname="postgres",
        user=DB_ADMIN,
        host=DB_HOST,
        port=DB_PORT,
        password=settings["admin_password"],
        autocommit=True,
        connect_timeout=5,
    ) as conn:
        for user, password in [
            (MIGRATOR, settings["migrator_password"]),
            (APP, settings["app_password"]),
        ]:
            exists = conn.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (user,)).fetchone()
            if not exists:
                conn.execute(
                    sql.SQL(
                        "CREATE ROLE {} LOGIN PASSWORD {} NOSUPERUSER NOCREATEDB NOCREATEROLE"
                    ).format(sql.Identifier(user), sql.Literal(password))
                )
        for database in [DATABASE, TEST_DATABASE]:
            exists = conn.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s", (database,)
            ).fetchone()
            if not exists:
                conn.execute(
                    sql.SQL("CREATE DATABASE {} OWNER {}").format(
                        sql.Identifier(database), sql.Identifier(MIGRATOR)
                    )
                )
            conn.execute(
                sql.SQL("REVOKE ALL ON DATABASE {} FROM PUBLIC").format(sql.Identifier(database))
            )
            conn.execute(
                sql.SQL("GRANT CONNECT ON DATABASE {} TO {}").format(
                    sql.Identifier(database), sql.Identifier(APP)
                )
            )
        for database in [DATABASE, TEST_DATABASE]:
            with psycopg.connect(
                dbname=database,
                user=MIGRATOR,
                host=DB_HOST,
                port=DB_PORT,
                password=settings["migrator_password"],
                autocommit=True,
            ) as migration_conn:
                migration_conn.execute("REVOKE ALL ON SCHEMA public FROM PUBLIC")
                migration_conn.execute("GRANT USAGE ON SCHEMA public TO grantum_app")
                migration_conn.execute(
                    "ALTER DEFAULT PRIVILEGES IN SCHEMA public"
                    " GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO grantum_app"
                )
                migration_conn.execute(
                    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO grantum_app"
                )


def setup(bin_path):
    if sys.platform != "win32":
        raise SystemExit("This setup command is for the Grantum Windows workstation.")
    private_dir()
    if CONFIG.exists():
        settings = load()
        if Path(settings["postgres_bin"]).resolve() != Path(bin_path).resolve():
            raise SystemExit("Use the PostgreSQL binary path stored in the existing Grantum setup.")
    else:
        if DATA.exists():
            raise SystemExit(
                "Grantum data exists without a settings file. Recover the settings before proceeding."
            )
        binary_dir = Path(bin_path).resolve()
        for binary in ["pg_ctl.exe", "initdb.exe"]:
            if not (binary_dir / binary).is_file():
                raise SystemExit(f"Missing {binary}. Point setup at PostgreSQL's bin directory.")
        settings = {
            "postgres_bin": binary_dir.as_posix(),
            "admin_password": secrets.token_urlsafe(32),
            "migrator_password": secrets.token_urlsafe(32),
            "app_password": secrets.token_urlsafe(32),
        }
        temporary = CONFIG.with_name("settings.new")
        temporary.write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
        temporary.replace(CONFIG)
    if not (DATA / "PG_VERSION").is_file():
        password_path = LOCAL / "init-password"
        password_path.write_text(settings["admin_password"] + "\n", encoding="ascii")
        try:
            run(
                [
                    tool(settings, "initdb"),
                    "-D",
                    str(DATA),
                    "--username",
                    DB_ADMIN,
                    "--auth=scram-sha-256",
                    "--encoding=UTF8",
                    "--locale=C",
                    f"--pwfile={password_path}",
                ]
            )
        finally:
            password_path.unlink(missing_ok=True)
    start(settings)
    configure_database(settings)


def environment(settings, database=DATABASE):
    def database_url(user, password):
        return URL.create(
            "postgresql+psycopg",
            username=user,
            password=password,
            host=DB_HOST,
            port=DB_PORT,
            database=database,
        ).render_as_string(hide_password=False)

    return {
        **os.environ,
        "GRANTUM_MODE": "local",
        "GRANTUM_DATABASE_URL": database_url(APP, settings["app_password"]),
        "GRANTUM_MIGRATION_URL": database_url(MIGRATOR, settings["migrator_password"]),
        "GRANTUM_FIREBASE_PROJECT": "demo-grantum-local",
        "FIREBASE_AUTH_EMULATOR_HOST": f"127.0.0.1:{AUTH_PORT}",
        "GRANTUM_ALLOWED_ORIGINS": "http://localhost:8081,http://127.0.0.1:8081",
        "GRANTUM_POSTHOG_KEY": "",
    }


def migrate(env):
    run([sys.executable, "-m", "alembic", "upgrade", "head"], env=env)
    # A runtime request cannot forge a schema migration receipt.
    with psycopg.connect(env["GRANTUM_MIGRATION_URL"].replace("+psycopg", "", 1)) as conn:
        conn.execute("REVOKE INSERT, UPDATE, DELETE ON alembic_version FROM grantum_app")


def main():
    from local_operations import backup, create_local_user, test_restore

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        choices=(
            "setup",
            "start-db",
            "stop-db",
            "migrate",
            "seed-demo",
            "serve",
            "test",
            "create-local-user",
            "backup",
            "restore-check",
        ),
    )
    parser.add_argument("--postgres-bin", default="C:/Program Files/PostgreSQL/19/bin")
    parser.add_argument("--email")
    parser.add_argument("--staff", action="store_true")
    args = parser.parse_args()
    if args.command == "setup":
        setup(args.postgres_bin)
        migrate(environment(load()))
        return
    settings = load()
    if args.command == "start-db":
        start(settings)
    elif args.command == "stop-db":
        if pg_control(settings, "status", check=False).returncode == 0:
            pg_control(settings, "stop", "-w", "-m", "fast")
    elif args.command == "migrate":
        migrate(environment(settings))
    elif args.command == "seed-demo":
        run([sys.executable, "-m", "grantum_api.seed"], env=environment(settings))
    elif args.command == "serve":
        from waitress import serve

        from grantum_api import create_app

        os.environ.update(environment(settings))
        serve(create_app(), host=DB_HOST, port=API_PORT, threads=4, expose_tracebacks=False)
    elif args.command == "create-local-user":
        create_local_user(settings, args.email, staff=args.staff)
    elif args.command == "backup":
        backup(settings)
    elif args.command == "restore-check":
        test_restore(settings)
    elif args.command == "test":
        env = environment(settings, TEST_DATABASE)
        migrate(env)
        run([sys.executable, "-m", "pytest", "-q"], env=env)


if __name__ == "__main__":
    main()
