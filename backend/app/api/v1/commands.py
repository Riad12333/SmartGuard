"""Remote commands + driving analytics routes."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.ml.driving_score import DrivingScoreService
from app.schemas.command import CommandRequest, CommandResponse
from app.schemas.driving_score import DrivingScoreResponse
from app.services.command_service import CommandService
from app.services.vehicle_service import VehicleService

router = APIRouter(prefix="/vehicles", tags=["Commands & Analytics"])


@router.post("/{vehicle_id}/commands", response_model=CommandResponse, status_code=status.HTTP_202_ACCEPTED)
async def send_vehicle_command(
    vehicle_id: int,
    data: CommandRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommandResponse:
    cmd = data.command.upper()
    return await CommandService(db).send_command(vehicle_id, current_user, cmd)


@router.get("/{vehicle_id}/commands", response_model=list[CommandResponse])
async def list_vehicle_commands(
    vehicle_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CommandResponse]:
    return await CommandService(db).list_commands(vehicle_id, current_user, limit=limit)


@router.get("/{vehicle_id}/driving-score", response_model=DrivingScoreResponse)
async def get_driving_score(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DrivingScoreResponse:
    await VehicleService(db).get_vehicle(vehicle_id, current_user)
    service = DrivingScoreService()
    latest = await service.get_fresh(db, vehicle_id)
    return DrivingScoreResponse.model_validate(latest)


@router.post("/{vehicle_id}/driving-score/refresh", response_model=DrivingScoreResponse)
async def refresh_driving_score(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DrivingScoreResponse:
    await VehicleService(db).get_vehicle(vehicle_id, current_user)
    record = await DrivingScoreService().compute_and_save(db, vehicle_id)
    return DrivingScoreResponse.model_validate(record)
