"""Profile avatar upload and removal."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.schemas.auth import UserResponse, user_to_response

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class AvatarService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def upload(self, user: User, file: UploadFile) -> UserResponse:
        content_type = (file.content_type or "").lower()
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fichier vide",
            )

        if content_type not in ALLOWED_CONTENT_TYPES:
            if content_type in ("application/octet-stream", ""):
                content_type = self._guess_content_type(file.filename, content)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Format non supporte. Utilisez JPEG, PNG ou WebP.",
                )
        if len(content) > settings.avatar_max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image trop volumineuse (max 5 Mo)",
            )

        ext = ALLOWED_CONTENT_TYPES[content_type]
        avatars_dir = settings.uploads_dir / "avatars"
        avatars_dir.mkdir(parents=True, exist_ok=True)

        self._delete_existing(user.id, avatars_dir)

        filename = f"user_{user.id}{ext}"
        target = avatars_dir / filename
        target.write_bytes(content)

        user.avatar_path = f"avatars/{filename}"
        user.updated_at = datetime.now(UTC)
        await self.db.flush()
        await self.db.refresh(user)
        return user_to_response(user)

    async def delete(self, user: User) -> UserResponse:
        avatars_dir = settings.uploads_dir / "avatars"
        self._delete_existing(user.id, avatars_dir)
        user.avatar_path = None
        user.updated_at = datetime.now(UTC)
        await self.db.flush()
        await self.db.refresh(user)
        return user_to_response(user)

    def _delete_existing(self, user_id: int, avatars_dir: Path) -> None:
        for path in avatars_dir.glob(f"user_{user_id}.*"):
            path.unlink(missing_ok=True)

    @staticmethod
    def _guess_content_type(filename: str | None, content: bytes) -> str:
        name = (filename or "").lower()
        if name.endswith(".png"):
            return "image/png"
        if name.endswith(".webp"):
            return "image/webp"
        if name.endswith((".jpg", ".jpeg")):
            return "image/jpeg"
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if content.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if content.startswith(b"RIFF") and content[8:12] == b"WEBP":
            return "image/webp"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format non supporte. Utilisez JPEG, PNG ou WebP.",
        )
