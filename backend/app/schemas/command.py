"""Remote command API schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

ALLOWED_COMMANDS = frozenset(
    {"REQUEST_LOCATION", "PING", "LOCK", "UNLOCK", "HONK", "EMERGENCY_ALERT"}
)


class CommandRequest(BaseModel):
    command: str = Field(min_length=1, max_length=64)

    def validate_command(self) -> str:
        cmd = self.command.upper()
        if cmd not in ALLOWED_COMMANDS:
            raise ValueError(f"Commande inconnue: {self.command}")
        return cmd


class CommandResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    vehicle_id: int
    command: str
    status: str
    created_at: datetime
    updated_at: datetime
