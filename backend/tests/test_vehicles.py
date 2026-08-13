"""Vehicle endpoint tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_vehicle_crud(client: AsyncClient, auth_headers: dict[str, str]):
    create_response = await client.post(
        "/api/v1/vehicles",
        headers=auth_headers,
        json={
            "brand": "Peugeot",
            "model": "208",
            "year": 2022,
            "color": "Blanc",
            "registration": "123-ABC-16",
            "device_id": "SG-DEVICE-001",
            "imei": "SIMULATED-001",
        },
    )
    assert create_response.status_code == 201
    vehicle = create_response.json()
    assert vehicle["brand"] == "Peugeot"
    assert vehicle["tracker"]["device_id"] == "SG-DEVICE-001"

    vehicle_id = vehicle["id"]

    list_response = await client.get("/api/v1/vehicles", headers=auth_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    get_response = await client.get(f"/api/v1/vehicles/{vehicle_id}", headers=auth_headers)
    assert get_response.status_code == 200

    patch_response = await client.patch(
        f"/api/v1/vehicles/{vehicle_id}",
        headers=auth_headers,
        json={"color": "Rouge"},
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["color"] == "Rouge"

    delete_response = await client.delete(f"/api/v1/vehicles/{vehicle_id}", headers=auth_headers)
    assert delete_response.status_code == 204


@pytest.mark.asyncio
async def test_vehicle_isolation_between_users(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "User",
            "last_name": "One",
            "email": "user1@example.com",
            "password": "Password1",
        },
    )
    login1 = await client.post(
        "/api/v1/auth/login",
        json={"email": "user1@example.com", "password": "Password1"},
    )
    headers1 = {"Authorization": f"Bearer {login1.json()['access_token']}"}

    create_response = await client.post(
        "/api/v1/vehicles",
        headers=headers1,
        json={"brand": "Renault", "model": "Clio"},
    )
    vehicle_id = create_response.json()["id"]

    await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "User",
            "last_name": "Two",
            "email": "user2@example.com",
            "password": "Password1",
        },
    )
    login2 = await client.post(
        "/api/v1/auth/login",
        json={"email": "user2@example.com", "password": "Password1"},
    )
    headers2 = {"Authorization": f"Bearer {login2.json()['access_token']}"}

    forbidden_response = await client.get(f"/api/v1/vehicles/{vehicle_id}", headers=headers2)
    assert forbidden_response.status_code == 404
