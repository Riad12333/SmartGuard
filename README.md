# SmartGuard

Plateforme IoT de **géolocalisation et de sécurité automobile**.

> MVP 1.0 — Simulateur de véhicule interchangeable avec un futur tracker GPS/4G/OBD.

## Fonctionnalités prévues

- Localisation en temps réel sur carte
- Historique des trajets et statistiques
- Geofencing et alertes de sécurité
- Score de risque antivol (règles métier)
- Commandes distantes (Phase avancée)

## Stack

| Couche | Technologie |
|--------|-------------|
| Mobile | React Native + Expo (Phase 4) |
| Backend | FastAPI + Python 3.12 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| IoT | MQTT (Mosquitto) |
| Temps réel | WebSocket |
| Containers | Docker Compose *(optionnel)* |

## Démarrage rapide — sans Docker (recommandé)

### Prérequis

- **Python 3.11+** ([python.org](https://www.python.org/downloads/))
- Aucun Docker requis

### 1. Configuration

```powershell
cd c:\Users\pc\Desktop\SmartGuard
copy .env.example .env
```

Le fichier `.env` utilise **SQLite** par défaut — la base de données est un simple fichier `smartguard.db`, sans installation supplémentaire.

### 2. Lancer le backend

```powershell
.\scripts\start-backend.ps1
```

Ou manuellement :

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Vérifier

| Service | URL |
|---------|-----|
| API Backend | http://localhost:8000 |
| Swagger (docs) | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

### 4. Tests

```powershell
cd backend
python -m pytest tests/ -v
```

---

## Démarrage avec Docker *(optionnel)*

Si vous utilisez Docker plus tard :

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré

### Lancer l'infrastructure

```powershell
cd infrastructure
docker compose up -d --build
```

Dans `.env`, remplacez `DATABASE_URL` par la version PostgreSQL :

```
DATABASE_URL=postgresql+asyncpg://smartguard:smartguard_dev_password@localhost:5432/smartguard
```

| Service | URL / Port |
|---------|------------|
| API Backend | http://localhost:8000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| MQTT Broker | localhost:1883 |

### Arrêter Docker

```powershell
cd infrastructure
docker compose down
```

---

## Phases suivantes sans Docker

| Phase | Besoin supplémentaire |
|-------|----------------------|
| Phase 1 (actuelle) | Python uniquement ✅ |
| Phase 2 (Simulator MQTT) | [Mosquitto](https://mosquitto.org/download/) *(ou `--dry-run`)* |
| Phase 3 (WebSocket) | Mosquitto + backend local |
| Phase 4 (Mobile) | Node.js + Expo ✅ |

## Structure du projet

```
smartguard/
├── backend/          # FastAPI — API REST, MQTT, WebSocket
├── simulator/        # Simulateur tracker GPS (Phase 2)
├── mobile/           # App React Native (Phase 4)
├── infrastructure/   # Docker Compose + Mosquitto
└── docs/             # Documentation architecture
```

## API Phase 1

Base URL : `http://localhost:8000/api/v1`

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/register` | Créer un compte |
| POST | `/auth/login` | Connexion (JWT) |
| POST | `/auth/refresh` | Renouveler le token |
| GET | `/auth/me` | Profil utilisateur |
| PATCH | `/auth/me` | Modifier le profil |
| POST | `/auth/change-password` | Changer le mot de passe |

### Véhicules

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/vehicles` | Liste des véhicules |
| POST | `/vehicles` | Ajouter un véhicule |
| GET | `/vehicles/{id}` | Détail d'un véhicule |
| PATCH | `/vehicles/{id}` | Modifier un véhicule |
| DELETE | `/vehicles/{id}` | Supprimer un véhicule |

### Exemple rapide

```bash
# Inscription
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Ali","last_name":"Benali","email":"ali@test.com","password":"Secret123"}'

# Connexion
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ali@test.com","password":"Secret123"}'

# Ajouter un véhicule (remplacer TOKEN)
curl -X POST http://localhost:8000/api/v1/vehicles \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"brand":"Peugeot","model":"208","device_id":"SG-DEVICE-001","imei":"SIMULATED-001"}'
```

## Simulateur GPS (Phase 2)

Le simulateur remplace le tracker hardware et publie sur MQTT :

```
vehicles/SG-DEVICE-001/telemetry   → position, vitesse, capteurs
vehicles/SG-DEVICE-001/events      → vol, remorquage, excès de vitesse
vehicles/SG-DEVICE-001/commands    ← commandes distantes (futur)
```

### Scénarios disponibles

| Scénario | Description |
|----------|-------------|
| `normal` | Trajet Maison → Centre-ville → Travail (50-70 km/h) |
| `stop` | Véhicule à l'arrêt, moteur éteint |
| `overspeed` | Excès de vitesse (> 80 km/h) |
| `theft` | Vol simulé à 03:15 — allumage + fuite hors zone |
| `towing` | Remorquage — mouvement sans allumage |

### Lancer le simulateur

**Sans Mosquitto** (test immédiat) :

```powershell
.\scripts\start-simulator.ps1 -Scenario normal -DryRun
```

**Avec Mosquitto** (broker MQTT local sur port 1883) :

```powershell
.\scripts\start-simulator.ps1 -Scenario normal
.\scripts\start-simulator.ps1 -Scenario theft
.\scripts\start-simulator.ps1 -Scenario towing
```

Manuellement :

```powershell
cd simulator
python -m pip install -r requirements.txt
python main.py --scenario normal --dry-run --max-ticks 5
python main.py --scenario theft
python main.py --list-scenarios
```

### Exemple de payload télémétrie

```json
{
  "device_id": "SG-DEVICE-001",
  "timestamp": "2026-08-13T14:00:00Z",
  "latitude": 36.7525,
  "longitude": 3.0420,
  "altitude": 120.0,
  "speed": 61.5,
  "heading": 124.0,
  "ignition": true,
  "battery_voltage": 13.8,
  "engine_temperature": 86.0,
  "rpm": 2300,
  "fuel_level": 63.0
}
```

## Temps reel (Phase 3)

Le backend ecoute MQTT au demarrage et stocke les positions en base.

### Nouveaux endpoints

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/vehicles/{id}/location` | Derniere position connue |
| GET | `/vehicles/{id}/positions?limit=100` | Historique GPS |

### WebSocket

```
ws://localhost:8000/ws/vehicles/{vehicle_id}?token=JWT_ACCESS_TOKEN
```

Message recu en temps reel :

```json
{
  "type": "vehicle_position",
  "vehicle_id": 1,
  "latitude": 36.7525,
  "longitude": 3.0420,
  "speed": 64.0,
  "heading": 124.0,
  "timestamp": "2026-08-13T14:00:00+00:00"
}
```

### Tester le flux complet

**Terminal 1 — Backend** (redemarrer pour activer Phase 3) :

```powershell
cd c:\Users\pc\Desktop\SmartGuard
.\scripts\start-backend.ps1
```

**Terminal 2 — Simulateur** :

```powershell
cd c:\Users\pc\Desktop\SmartGuard
.\scripts\start-simulator.ps1 -Scenario normal
```

**Terminal 3 — Verifier la position** (apres login) :

```powershell
curl http://localhost:8000/api/v1/vehicles/1/location -H "Authorization: Bearer TOKEN"
```

## Application mobile (Phase 4)

```powershell
.\scripts\start-mobile.ps1
```

Puis :
- **`w`** — navigateur web (test rapide)
- **QR code** — Expo Go sur telephone

Assurez-vous que le backend tourne et qu'un vehicule avec `SG-DEVICE-001` existe.

## Roadmap

- [x] **Phase 0** — Architecture + Docker Compose
- [x] **Phase 1** — Backend FastAPI + auth JWT + CRUD véhicules
- [x] **Phase 2** — Vehicle Simulator MQTT
- [x] **Phase 3** — MQTT consumer + WebSocket temps réel
- [x] **Phase 4** — Application React Native
- [x] **Phase 5** — Geofencing + moteur antivol
- [x] **Phase 6** — Commandes distantes + ML conduite + hardware

## Documentation

- [Architecture détaillée](docs/architecture.md)

## Licence

Projet privé — SmartGuard © 2026
