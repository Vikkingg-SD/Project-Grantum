#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export GRANTUM_MODE=local
export GRANTUM_DATABASE_URL='postgresql+psycopg://grantum_app:fixture-runtime@127.0.0.1:55432/grantum_test'
export GRANTUM_MIGRATION_URL='postgresql+psycopg://grantum_migrator:fixture-migrator@127.0.0.1:55432/grantum_test'
export GRANTUM_FIREBASE_PROJECT='demo-grantum-local'
export FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:59099'
export GRANTUM_ALLOWED_ORIGINS='http://localhost:8081,http://127.0.0.1:8081'
export XDG_CONFIG_HOME="$PWD/.local/firebase-xdg"
export NPM_CONFIG_CACHE="$PWD/.local/npm-cache"
export NPM_CONFIG_USERCONFIG="$PWD/.local/npmrc"
export FIREBASE_CLI_DISABLE_USAGE=true

.venv/bin/ruff check .
.venv/bin/ruff format --check .
.venv/bin/python -m alembic upgrade head
PGPASSWORD=fixture-migrator psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 55432 -U grantum_migrator grantum_test \
  -c 'REVOKE INSERT, UPDATE, DELETE ON alembic_version FROM grantum_app'
node .local/firebase-cli/node_modules/firebase-tools/lib/bin/firebase.js \
  emulators:exec --only auth --project demo-grantum-local --config firebase.json \
  '.venv/bin/python -m pytest -q'
