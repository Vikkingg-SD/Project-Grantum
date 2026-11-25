from os import environ

from alembic import context
from grantum_api.models import Base
from sqlalchemy import create_engine, pool

if context.is_offline_mode():
    raise RuntimeError("Apply Grantum migrations against an explicit database connection.")

with create_engine(environ["GRANTUM_MIGRATION_URL"], poolclass=pool.NullPool).connect() as conn:
    context.configure(connection=conn, target_metadata=Base.metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()
