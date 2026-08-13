# SmartGuard — Branchement tracker hardware reel

## Principe

Le simulateur et un tracker GPS 4G reel utilisent **le meme contrat MQTT**. Aucune modification backend/mobile requise.

## Topics MQTT

| Topic | Direction |
|-------|-----------|
| `vehicles/{device_id}/telemetry` | Device → Backend |
| `vehicles/{device_id}/events` | Device → Backend |
| `vehicles/{device_id}/commands` | Backend → Device |

## Etapes

### 1. Configurer le tracker

- Broker MQTT : IP de votre PC + port `1883`
- `device_id` : ex. `SG-DEVICE-002` (identique a l'app)
- Format JSON identique au simulateur (voir README)

### 2. Associer dans l'app

1. Creer un compte
2. Ajouter un vehicule avec le **meme device_id** que le tracker
3. Activer la zone Maison (vehicule gare devant chez vous)

### 3. Commandes distantes (Phase 6)

Depuis l'app → Vehicule → Securite → Commandes distantes :

| Commande | Action simulateur / hardware |
|----------|------------------------------|
| `REQUEST_LOCATION` | Position GPS immediate |
| `PING` | Test connectivite |
| `LOCK` / `UNLOCK` | Verrouillage simule |
| `HONK` | Klaxon / signal |
| `EMERGENCY_ALERT` | Alerte urgence |

Le tracker doit s'abonner a `vehicles/{device_id}/commands` et repondre avec un event `COMMAND_ACK`.

### 4. ML / Score de conduite

Le backend analyse automatiquement :
- Freinages / accelerations brusques
- Exces de vitesse
- Conduite nocturne
- Mouvement sans allumage

Visible dans l'app → Vehicule → Stats → Score de conduite.

## Trackers compatibles

Tout device capable de :
- Publier JSON sur MQTT
- S'abonner aux commandes
- Envoyer GPS + ignition + vitesse

Exemples : Teltonika FMB, Queclink, certains OBD 4G avec firmware MQTT custom.

## Production

- MQTT avec authentification (`MQTT_USERNAME` / `MQTT_PASSWORD`)
- Broker expose via TLS (port 8883)
- HTTPS pour l'API backend
