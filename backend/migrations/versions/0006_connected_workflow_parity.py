"""Add project revisions, workplan tasks, attempt outputs, and bounty drafts."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "project_revisions",
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.String(length=36), nullable=True),
        sa.Column("summary", sa.String(length=240), server_default="", nullable=False),
        sa.Column("snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["actor_id"], ["accounts.id"]),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("project_id", "version"),
    )
    op.execute(
        """
        INSERT INTO project_revisions (project_id, version, actor_id, summary, snapshot)
        SELECT
          p.id,
          p.version,
          COALESCE(p.creation_account_id, (
            SELECT m.account_id FROM memberships m
            WHERE m.project_id = p.id AND m.role = 'owner'
            LIMIT 1
          )),
          'Initial profile',
          jsonb_build_object(
            'name', p.name,
            'description', p.description,
            'region', p.region,
            'legalEntity', p.legal_entity,
            'archived', p.archived
          )
        FROM projects p
        ON CONFLICT (project_id, version) DO NOTHING
        """
    )

    op.add_column("attempts", sa.Column("profile_version", sa.Integer(), nullable=True))
    op.add_column(
        "attempts",
        sa.Column(
            "outputs",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[\"application\"]'::jsonb"),
            nullable=False,
        ),
    )
    op.add_column(
        "attempts",
        sa.Column("export_narrative", sa.Text(), server_default="", nullable=False),
    )
    op.create_check_constraint(
        "ck_attempts_profile_version",
        "attempts",
        "profile_version IS NULL OR profile_version >= 1",
    )
    op.execute(
        """
        UPDATE attempts a
        SET profile_version = p.version
        FROM projects p
        WHERE p.id = a.project_id AND a.profile_version IS NULL
        """
    )

    op.create_table(
        "attempt_tasks",
        sa.Column("attempt_id", sa.String(length=36), nullable=False),
        sa.Column("task_key", sa.String(length=40), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("updated_by", sa.String(length=36), nullable=False),
        sa.Column("updated_by_role", sa.String(length=12), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('open', 'verified', 'marked_done')",
            name="ck_attempt_tasks_status",
        ),
        sa.CheckConstraint(
            "updated_by_role IN ('owner', 'editor', 'reviewer', 'viewer')",
            name="ck_attempt_tasks_role",
        ),
        sa.ForeignKeyConstraint(["attempt_id"], ["attempts.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["accounts.id"]),
        sa.PrimaryKeyConstraint("attempt_id", "task_key"),
    )

    op.add_column(
        "bounties",
        sa.Column("region", sa.String(length=160), server_default="", nullable=False),
    )
    op.add_column(
        "bounties",
        sa.Column("prize_pool", sa.String(length=160), server_default="", nullable=False),
    )
    op.add_column(
        "bounties",
        sa.Column("mission", sa.String(length=500), server_default="", nullable=False),
    )
    op.execute(
        """
        DO $$
        DECLARE
          constraint_name text;
        BEGIN
          FOR constraint_name IN
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'bounties'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) LIKE '%status%'
          LOOP
            EXECUTE format('ALTER TABLE bounties DROP CONSTRAINT %I', constraint_name);
          END LOOP;
        END $$;
        """
    )
    op.create_check_constraint(
        "ck_bounties_status",
        "bounties",
        "status IN ('draft', 'pending', 'approved', 'rejected', 'changes_requested')",
    )


def downgrade():
    op.drop_constraint("ck_bounties_status", "bounties", type_="check")
    op.create_check_constraint(
        "bounties_status_check",
        "bounties",
        "status IN ('pending', 'approved', 'rejected', 'changes_requested')",
    )
    op.drop_column("bounties", "mission")
    op.drop_column("bounties", "prize_pool")
    op.drop_column("bounties", "region")

    op.drop_table("attempt_tasks")

    op.drop_constraint("ck_attempts_profile_version", "attempts", type_="check")
    op.drop_column("attempts", "export_narrative")
    op.drop_column("attempts", "outputs")
    op.drop_column("attempts", "profile_version")

    op.drop_table("project_revisions")
