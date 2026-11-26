"""Keep the original request identity while authors revise a bounty."""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("bounties", sa.Column("creation_hash", sa.String(64)))


def downgrade():
    op.drop_column("bounties", "creation_hash")
