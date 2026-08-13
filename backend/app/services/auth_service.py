"""Authentication business logic."""

from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    reset_token_expires_at,
    verify_password,
    verify_token_type,
)
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordResponse,
    PasswordChange,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserProfileUpdate,
    UserRegister,
    UserResponse,
    user_to_response,
)
from jose import JWTError


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: UserRegister) -> UserResponse:
        existing = await self.db.execute(select(User).where(User.email == data.email.lower()))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un compte existe déjà avec cet email",
            )

        user = User(
            first_name=data.first_name.strip(),
            last_name=data.last_name.strip(),
            email=data.email.lower(),
            password_hash=hash_password(data.password),
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user_to_response(user)

    async def login(self, data: UserLogin) -> TokenResponse:
        result = await self.db.execute(select(User).where(User.email == data.email.lower()))
        user = result.scalar_one_or_none()
        if user is None or not verify_password(data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
            )

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
            user_id = verify_token_type(payload, "refresh")
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token invalide ou expiré",
            ) from exc

        result = await self.db.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Utilisateur introuvable",
            )

        return TokenResponse(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
        )

    async def update_profile(self, user: User, data: UserProfileUpdate) -> UserResponse:
        if data.first_name is not None:
            user.first_name = data.first_name.strip()
        if data.last_name is not None:
            user.last_name = data.last_name.strip()

        await self.db.flush()
        await self.db.refresh(user)
        return user_to_response(user)

    async def change_password(self, user: User, data: PasswordChange) -> None:
        if not verify_password(data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mot de passe actuel incorrect",
            )
        user.password_hash = hash_password(data.new_password)
        await self.db.flush()

    async def request_password_reset(self, email: str) -> ForgotPasswordResponse:
        from app.core.config import settings

        message = (
            "Si un compte existe avec cet email, un lien de reinitialisation a ete envoye."
        )
        result = await self.db.execute(select(User).where(User.email == email.lower()))
        user = result.scalar_one_or_none()
        if user is None:
            return ForgotPasswordResponse(message=message)

        existing = (
            await self.db.execute(
                select(PasswordResetToken).where(
                    PasswordResetToken.user_id == user.id,
                    PasswordResetToken.used_at.is_(None),
                )
            )
        ).scalars().all()
        for token_row in existing:
            token_row.used_at = datetime.now(UTC)

        plain_token = generate_reset_token()
        reset_row = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(plain_token),
            expires_at=reset_token_expires_at(),
        )
        self.db.add(reset_row)
        await self.db.flush()

        reset_token: str | None = None
        if settings.debug:
            reset_token = plain_token
            print(f"[SmartGuard DEBUG] Reset token pour {email}: {plain_token}")

        return ForgotPasswordResponse(message=message, reset_token=reset_token)

    async def reset_password(self, data: ResetPasswordRequest) -> None:
        token_hash = hash_reset_token(data.token)
        now = datetime.now(UTC)
        result = await self.db.execute(
            select(PasswordResetToken)
            .where(
                PasswordResetToken.token_hash == token_hash,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.expires_at > now,
            )
            .limit(1)
        )
        reset_row = result.scalar_one_or_none()
        if reset_row is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token invalide ou expire",
            )

        user_result = await self.db.execute(select(User).where(User.id == reset_row.user_id))
        user = user_result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token invalide ou expire",
            )

        user.password_hash = hash_password(data.new_password)
        reset_row.used_at = now
        await self.db.flush()
