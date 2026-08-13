"""User profile avatar path."""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_user_avatar"
down_revision: Union[str, None] = "005_phase6_commands_ml"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_path", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_path")
