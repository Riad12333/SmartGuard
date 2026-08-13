# SmartGuard — Architecture

> Phase 0 — Infrastructure & project skeleton  
> Version: MVP 1.0

## Vision

SmartGuard est une plateforme IoT de géolocalisation et de sécurité automobile. Le MVP utilise un **simulateur de véhicule** interchangeable avec un futur tracker GPS/4G/OBD réel.

## Architecture MVP

```
┌─────────────────────┐
│  Vehicle Simulator  │  Python — remplace le hardware IoT
│  (Python)           │
└──────────┬──────────┘
           │ MQTT
           ▼
┌─────────────────────┐
│  Mosquitto Broker   │  Port 1883
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  FastAPI Backend    │  Port 8000 — REST + WebSocket
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
 PostgreSQL    Redis
  Port 5432   Port 6379
     │
     ▼ WebSocket
┌─────────────────────┐
│  React Native App   │  Phase 4
└─────────────────────┘
```

## Architecture cible (post-MVP)

```
Vehicle (GPS/OBD/Sensors)
        │ 4G
        ▼
   IoT Gateway (MQTT/TCP)
        ▼
   FastAPI Backend
        │
   PostgreSQL + Redis
        │
   WebSocket → Mobile App
```

Le **contrat MQTT** reste identique entre simulateur et tracker réel.

## Contrat IoT (MQTT)

| Topic | Direction | Description |
|-------|-----------|-------------|
| `vehicles/{device_id}/telemetry` | Device → Backend | Position, vitesse, capteurs |
| `vehicles/{device_id}/events` | Device → Backend | Événements (vol, remorquage…) |
| `vehicles/{device_id}/commands` | Backend → Device | Commandes distantes |

### Payload télémétrie

```json
{
  "device_id": "SG-DEVICE-001",
  "timestamp": "2026-08-12T22:30:00Z",
  "latitude": 36.7525,
  "longitude": 3.0420,
  "speed": 61.5,
  "heading": 124,
  "altitude": 50,
  "ignition": true,
  "battery_voltage": 12.5,
  "engine_temperature": 86,
  "rpm": 2300,
  "fuel_level": 63
}
```

## Structure du projet

```
smartguard/
├── backend/           FastAPI — API REST, MQTT consumer, WebSocket
│   └── app/
│       ├── api/       Routes REST
│       ├── core/      Config, DB, auth
│       ├── models/    SQLAlchemy ORM
│       ├── schemas/   Pydantic DTOs
│       ├── services/  Logique métier
│       ├── repositories/
│       ├── mqtt/      Consumer MQTT
│       ├── websocket/ Temps réel
│       └── security/  Geofencing, risk engine
├── simulator/         Simulateur tracker GPS
├── mobile/            React Native + Expo (Phase 4)
├── infrastructure/    Docker Compose, Mosquitto
└── docs/              Documentation
```

## Services Docker (Phase 0)

| Service | Image | Port | Rôle |
|---------|-------|------|------|
| `postgres` | postgres:16-alpine | 5432 | Base de données principale |
| `redis` | redis:7-alpine | 6379 | Cache, sessions, pub/sub |
| `mosquitto` | eclipse-mosquitto:2 | 1883 | Broker MQTT IoT |
| `backend` | custom (FastAPI) | 8000 | API REST + docs OpenAPI |

## Modèle de données (aperçu)

Tables prévues en Phase 1 :

- `users` — comptes utilisateurs
- `vehicles` — véhicules associés
- `trackers` — dispositifs IoT (simulés ou réels)
- `vehicle_positions` — historique GPS
- `vehicle_telemetry` — données capteurs
- `trips` — trajets calculés
- `geofences` — zones géographiques
- `alerts` — alertes de sécurité

Voir le cahier des charges pour le schéma complet.

## Roadmap

| Phase | Contenu | Statut |
|-------|---------|--------|
| 0 | Architecture, Docker, Mosquitto | ✅ |
| 1 | Backend FastAPI, auth JWT, CRUD | ✅ |
| 2 | Vehicle Simulator MQTT | ✅ |
| 3 | MQTT consumer, WebSocket | ✅ |
| 4 | App React Native | ✅ |
| 5 | Geofencing, antivol, alertes | ⏳ |
| 6 | Hardware réel, ML | ⏳ |

## Sécurité (principes)

- JWT pour l'authentification API
- Hash Argon2/bcrypt pour les mots de passe
- Isolation des données par utilisateur (un user ne voit jamais le véhicule d'un autre)
- Secrets dans `.env` (jamais commités)
- Authentification MQTT devices (Phase 1+)
- HTTPS en production

## Remplacement simulateur → tracker réel

1. Acheter un tracker 4G/OBD compatible MQTT ou TCP
2. Configurer le `device_id` et l'`IMEI` dans la table `trackers`
3. Pointer le tracker vers le broker Mosquitto (ou gateway)
4. **Aucune modification** de l'app mobile ni du backend requise

Le simulateur et le tracker réel publient sur les mêmes topics avec le même format JSON.
