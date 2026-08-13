"""Phase 6: remote commands + driving scores."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_phase6_commands_ml"
down_revision: Union[str, None] = "004_phase5_security"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "device_commands",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("command", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="pending", nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=True),
        sa.Column("response_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_device_commands_vehicle_id"), "device_commands", ["vehicle_id"])
    op.create_index(op.f("ix_device_commands_user_id"), "device_commands", ["user_id"])
    op.create_index(op.f("ix_device_commands_created_at"), "device_commands", ["created_at"])

    op.create_table(
        "driving_scores",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), server_default="100", nullable=False),
        sa.Column("grade", sa.String(length=20), server_default="excellent", nullable=False),
        sa.Column("harsh_braking_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("harsh_accel_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("overspeed_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("night_trips_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("distance_km", sa.Float(), server_default="0", nullable=False),
        sa.Column("factors_json", sa.Text(), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_driving_scores_vehicle_id"), "driving_scores", ["vehicle_id"])
    op.create_index(op.f("ix_driving_scores_computed_at"), "driving_scores", ["computed_at"])


def downgrade() -> None:
    op.drop_index(op.f("ix_driving_scores_computed_at"), table_name="driving_scores")
    op.drop_index(op.f("ix_driving_scores_vehicle_id"), table_name="driving_scores")
    op.drop_table("driving_scores")
    op.drop_index(op.f("ix_device_commands_created_at"), table_name="device_commands")
    op.drop_index(op.f("ix_device_commands_user_id"), table_name="device_commands")
    op.drop_index(op.f("ix_device_commands_vehicle_id"), table_name="device_commands")
    op.drop_table("device_commands")
