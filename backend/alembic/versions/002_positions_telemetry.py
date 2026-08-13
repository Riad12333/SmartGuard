"""Position and telemetry tables."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_positions_telemetry"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "vehicle_positions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("altitude", sa.Float(), nullable=True),
        sa.Column("speed", sa.Float(), nullable=True),
        sa.Column("heading", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_vehicle_positions_vehicle_id"), "vehicle_positions", ["vehicle_id"])
    op.create_index(op.f("ix_vehicle_positions_timestamp"), "vehicle_positions", ["timestamp"])

    op.create_table(
        "vehicle_telemetry",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ignition", sa.Boolean(), nullable=False),
        sa.Column("rpm", sa.Integer(), nullable=True),
        sa.Column("engine_temperature", sa.Float(), nullable=True),
        sa.Column("battery_voltage", sa.Float(), nullable=True),
        sa.Column("fuel_level", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_vehicle_telemetry_vehicle_id"), "vehicle_telemetry", ["vehicle_id"])
    op.create_index(op.f("ix_vehicle_telemetry_timestamp"), "vehicle_telemetry", ["timestamp"])


def downgrade() -> None:
    op.drop_index(op.f("ix_vehicle_telemetry_timestamp"), table_name="vehicle_telemetry")
    op.drop_index(op.f("ix_vehicle_telemetry_vehicle_id"), table_name="vehicle_telemetry")
    op.drop_table("vehicle_telemetry")
    op.drop_index(op.f("ix_vehicle_positions_timestamp"), table_name="vehicle_positions")
    op.drop_index(op.f("ix_vehicle_positions_vehicle_id"), table_name="vehicle_positions")
    op.drop_table("vehicle_positions")
