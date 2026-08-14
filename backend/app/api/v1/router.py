"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1 import alerts, auth, commands, geofences, location, security, system, vehicles

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(vehicles.router)
api_router.include_router(location.router)
api_router.include_router(alerts.router)
api_router.include_router(geofences.router)
api_router.include_router(security.router)
api_router.include_router(commands.router)
api_router.include_router(system.router)
