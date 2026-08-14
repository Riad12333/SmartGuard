"""SmartGuard FastAPI application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app.models import Alert, DeviceCommand, DrivingScore, Geofence, Tracker, Trip, User, Vehicle, VehiclePosition, VehicleTelemetry  # noqa: F401
from app.mqtt.consumer import mqtt_consumer
from app.websocket.routes import router as ws_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.uses_sqlite:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    await mqtt_consumer.start()
    yield
    await mqtt_consumer.stop()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Plateforme IoT de geolocalisation et de securite automobile",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)
app.include_router(ws_router)

settings.uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.uploads_dir)), name="uploads")


@app.get("/health", tags=["Health"])
async def health_check() -> dict:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
        "phase": "6",
        "mqtt_broker": f"{settings.mqtt_broker_host}:{settings.mqtt_broker_port}",
        "mqtt_tls": settings.mqtt_use_tls or settings.mqtt_broker_port == 8883,
        "mqtt_auth": bool(settings.mqtt_username),
        "mqtt_consumer_connected": mqtt_consumer.connected,
    }


@app.get("/", tags=["Health"])
async def root() -> dict:
    return {
        "message": "SmartGuard API",
        "docs": "/docs",
        "health": "/health",
        "api": settings.api_v1_prefix,
        "websocket": "/ws/vehicles/{vehicle_id}?token=JWT",
    }
