"""Track bounty versions across moderation and resubmission."""

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "bounties", sa.Column("version", sa.Integer(), nullable=False, server_default="1")
    )


def downgrade():
    op.drop_column("bounties", "version")
