"""Driving score computation from recent telemetry."""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.driving_score import DrivingScore
from app.models.vehicle_position import VehiclePosition


class DrivingScoreService:
    async def get_fresh(
        self,
        db: AsyncSession,
        vehicle_id: int,
        *,
        max_age_seconds: int = 30,
    ) -> DrivingScore:
        latest = await self.get_latest(db, vehicle_id)
        if latest is None:
            return await self.compute_and_save(db, vehicle_id)

        computed = latest.computed_at
        if computed.tzinfo is None:
            computed = computed.replace(tzinfo=UTC)
        age = (datetime.now(UTC) - computed).total_seconds()
        if age > max_age_seconds:
            return await self.compute_and_save(db, vehicle_id)
        return latest

    async def compute_and_save(self, db: AsyncSession, vehicle_id: int) -> DrivingScore:
        since = datetime.now(UTC) - timedelta(hours=24)
        result = await db.execute(
            select(VehiclePosition)
            .where(VehiclePosition.vehicle_id == vehicle_id, VehiclePosition.timestamp >= since)
            .order_by(VehiclePosition.timestamp.asc())
        )
        positions = list(result.scalars().all())

        harsh_braking = 0
        harsh_accel = 0
        overspeed = 0
        night_trips = 0
        distance_km = 0.0

        for i, pos in enumerate(positions):
            if i > 0:
                prev = positions[i - 1]
                delta = (pos.speed or 0) - (prev.speed or 0)
                if delta >= 25:
                    harsh_accel += 1
                if delta <= -30:
                    harsh_braking += 1
                # rough distance
                from app.security.geofence_utils import haversine_m

                distance_km += haversine_m(
                    prev.latitude, prev.longitude, pos.latitude, pos.longitude
                ) / 1000.0

            speed = pos.speed or 0
            if speed > settings.overspeed_limit_kmh:
                overspeed += 1
            hour = pos.timestamp.astimezone(UTC).hour if pos.timestamp.tzinfo else pos.timestamp.hour
            if hour < 5 and speed > 20:
                night_trips += 1

        score = 100
        score -= min(40, harsh_braking * 8)
        score -= min(30, harsh_accel * 6)
        score -= min(25, overspeed * 3)
        score -= min(15, night_trips * 5)
        score = max(0, score)

        if score >= 85:
            grade = "excellent"
        elif score >= 70:
            grade = "good"
        elif score >= 50:
            grade = "average"
        else:
            grade = "risky"

        factors = {
            "harsh_braking": harsh_braking,
            "harsh_accel": harsh_accel,
            "overspeed": overspeed,
            "night_trips": night_trips,
            "distance_km": round(distance_km, 2),
            "samples": len(positions),
        }

        record = DrivingScore(
            vehicle_id=vehicle_id,
            score=score,
            grade=grade,
            harsh_braking_count=harsh_braking,
            harsh_accel_count=harsh_accel,
            overspeed_count=overspeed,
            night_trips_count=night_trips,
            distance_km=round(distance_km, 2),
            factors_json=json.dumps(factors),
        )
        db.add(record)
        await db.flush()
        await db.refresh(record)
        return record

    async def get_latest(self, db: AsyncSession, vehicle_id: int) -> DrivingScore | None:
        result = await db.execute(
            select(DrivingScore)
            .where(DrivingScore.vehicle_id == vehicle_id)
            .order_by(DrivingScore.computed_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
