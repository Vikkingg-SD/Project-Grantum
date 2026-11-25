"""Make a project's create request repeatable."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("projects", sa.Column("creation_account_id", sa.String(36)))
    op.add_column("projects", sa.Column("creation_request_key", sa.String(36)))
    op.add_column("projects", sa.Column("creation_hash", sa.String(64)))
    op.create_foreign_key(
        "fk_project_creation_account", "projects", "accounts", ["creation_account_id"], ["id"]
    )
    op.create_unique_constraint(
        "uq_project_request", "projects", ["creation_account_id", "creation_request_key"]
    )


def downgrade():
    op.drop_constraint("uq_project_request", "projects")
    op.drop_constraint("fk_project_creation_account", "projects", type_="foreignkey")
    for name in ("creation_account_id", "creation_request_key", "creation_hash"):
        op.drop_column("projects", name)
