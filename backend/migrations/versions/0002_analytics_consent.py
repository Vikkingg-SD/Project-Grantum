"""Add optional, consented product telemetry."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "accounts",
        sa.Column(
            "analytics_opt_in",
            sa.Boolean(),
            server_default=sa.false(),
            nullable=False,
        ),
    )
    op.create_table(
        "analytics_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("account_id", sa.String(36), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("event", sa.String(40), nullable=False),
        sa.Column("failures", sa.Integer(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "next_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("event IN ('attempt_created', 'application_exported')"),
    )
    op.create_index("ix_analytics_events_next_at", "analytics_events", ["next_at"])
    op.create_index("ix_analytics_events_account_id", "analytics_events", ["account_id"])


def downgrade():
    op.drop_table("analytics_events")
    op.drop_column("accounts", "analytics_opt_in")
