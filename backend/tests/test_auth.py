"""Authentication endpoint tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    register_response = await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Sara",
            "last_name": "Khelifi",
            "email": "sara@example.com",
            "password": "Password1",
        },
    )
    assert register_response.status_code == 201
    assert register_response.json()["email"] == "sara@example.com"

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "sara@example.com", "password": "Password1"},
    )
    assert login_response.status_code == 200
    data = login_response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "first_name": "Test",
        "last_name": "User",
        "email": "dup@example.com",
        "password": "Password1",
    }
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_me_requires_auth(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_and_refresh(client: AsyncClient, auth_headers: dict[str, str]):
    me_response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "ali@example.com"

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "ali@example.com", "password": "Secret123"},
    )
    refresh_token = login_response.json()["refresh_token"]
    refresh_response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_response.status_code == 200
    assert "access_token" in refresh_response.json()


@pytest.mark.asyncio
async def test_forgot_and_reset_password(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Reset",
            "last_name": "Test",
            "email": "reset@example.com",
            "password": "OldPass123",
        },
    )

    forgot_response = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset@example.com"},
    )
    assert forgot_response.status_code == 200
    data = forgot_response.json()
    assert "message" in data
    assert data.get("reset_token")  # mode debug

    reset_response = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": data["reset_token"], "new_password": "NewPass456"},
    )
    assert reset_response.status_code == 204

    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "OldPass123"},
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "NewPass456"},
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_forgot_password_unknown_email(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == 200
    assert "message" in response.json()
