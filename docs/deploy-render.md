# Déploiement SmartGuard sur Render

Guide pour héberger l’API backend en cloud (**Option C**) — l’app mobile fonctionne sans PC local.

## Architecture Render

| Composant | Service Render | Plan |
|-----------|----------------|------|
| API FastAPI | Web Service `smartguard-api` | Free |
| PostgreSQL | Database `smartguard-db` | Free |
| MQTT (télémétrie live) | Externe (optionnel) | Voir § MQTT |
| Photos profil | Disque éphémère (free) ou persistant (Starter+) | — |

## Prérequis

- Compte [Render](https://render.com)
- Repo GitHub avec le code SmartGuard
- Node.js / Expo pour reconfigurer le mobile après déploiement

---

## Méthode A — Blueprint (recommandée)

Le fichier `render.yaml` à la racine du repo décrit toute l’infrastructure.

### Étapes

1. **Poussez le code sur GitHub**
   ```powershell
   git add .
   git commit -m "Add Render deployment config"
   git push origin main
   ```

2. **Render Dashboard** → **New** → **Blueprint**

3. Connectez le repo GitHub `SmartGuard`

4. Render détecte `render.yaml` et propose :
   - `smartguard-db` (PostgreSQL)
   - `smartguard-api` (Web Service Python)

5. Cliquez **Apply** — le premier déploiement prend ~5–10 min

6. Notez l’URL publique, ex. :
   ```
   https://smartguard-api.onrender.com
   ```

7. **Vérifiez** :
   ```powershell
   curl https://smartguard-api.onrender.com/health
   ```
   Réponse attendue : `"status": "ok"`, `"phase": "6"`

---

## Méthode B — Manuelle (sans Blueprint)

### 1. Base PostgreSQL

- **New** → **PostgreSQL**
- Name : `smartguard-db`
- Database : `smartguard`
- User : `smartguard`
- Region : **Frankfurt** (proche Algérie)
- Plan : **Free**

Copiez **Internal Database URL** (ou External si besoin).

### 2. Web Service

- **New** → **Web Service**
- Connectez le repo
- **Root Directory** : `backend`
- **Runtime** : Python 3
- **Build Command** :
  ```bash
  pip install -r requirements.txt
  ```
- **Start Command** :
  ```bash
  bash scripts/render-start.sh
  ```
- **Health Check Path** : `/health`

### 3. Variables d’environnement

| Variable | Valeur |
|----------|--------|
| `PYTHON_VERSION` | `3.12.7` |
| `DATABASE_URL` | *(coller l’URL Postgres Render — conversion auto en asyncpg)* |
| `SECRET_KEY` | *(générer une clé longue aléatoire)* |
| `DEBUG` | `false` |
| `CORS_ORIGINS` | `*` |

Render injecte souvent `DATABASE_URL` au format `postgres://...` — le backend convertit automatiquement en `postgresql+asyncpg://`.

---

## Configurer l’app mobile

1. Copiez le template production :
   ```powershell
   cd mobile
   copy .env.production.example .env
   ```

2. Éditez `mobile/.env` avec votre URL Render :
   ```env
   EXPO_PUBLIC_API_URL=https://smartguard-api.onrender.com
   EXPO_PUBLIC_WS_URL=wss://smartguard-api.onrender.com
   ```

3. Relancez Expo avec cache vidé :
   ```powershell
   cd ..
   .\scripts\start-mobile.ps1
   ```

4. **Reconnectez-vous** dans l’app (nouvelle base cloud = comptes vides)

> Plus besoin de `192.168.x.x` — l’app fonctionne en Wi‑Fi, 4G, PC éteint.

---

## Limitations plan Free Render

| Sujet | Comportement |
|-------|--------------|
| **Cold start** | Service endormi après ~15 min d’inactivité → 30–60 s au 1er appel |
| **Photos profil** | Perdues au redeploy (disque éphémère) — ajoutez un disque persistant en plan Starter+ |
| **MQTT live** | Pas de broker sur Render — voir ci‑dessous |
| **WebSocket** | Supporté (`wss://`) sur le Web Service |

Pour éviter le cold start en production : plan **Starter** (~7 $/mois).

---

## MQTT (télémétrie / simulateur) — Option B

L’API et le simulateur doivent utiliser **le même broker MQTT cloud**. `localhost` ne fonctionne pas avec Render.

### 1. Créer un broker HiveMQ Cloud (gratuit)

1. Allez sur [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/) → **Get started free**
2. Créez un cluster (région **EU** recommandée)
3. Notez dans le dashboard :
   - **Broker URL** → ex. `abc123.s1.eu.hivemq.cloud`
   - **Port** → `8883` (TLS)
   - **Username** et **Password** (générés à la création)

### 2. Configurer Render

**Render Dashboard** → `smartguard-api` → **Environment** → ajoutez :

| Variable | Valeur |
|----------|--------|
| `MQTT_BROKER_HOST` | `abc123.s1.eu.hivemq.cloud` |
| `MQTT_BROKER_PORT` | `8883` |
| `MQTT_USERNAME` | *(utilisateur HiveMQ)* |
| `MQTT_PASSWORD` | *(mot de passe HiveMQ)* |
| `MQTT_USE_TLS` | `true` |

Puis **Save** → **Manual Deploy** (ou attendez l’auto-deploy).

Vérifiez :
```powershell
curl.exe -s https://smartguard-api.onrender.com/health
```
Attendu : `"mqtt_broker": "abc123....:8883"`, `"mqtt_tls": true`, `"mqtt_auth": true`

### 3. Configurer votre PC (simulateur)

Éditez le fichier `.env` **à la racine** du projet (copiez depuis `.env.example` si besoin) :

```env
MQTT_BROKER_HOST=abc123.s1.eu.hivemq.cloud
MQTT_BROKER_PORT=8883
MQTT_USERNAME=votre-utilisateur-hivemq
MQTT_PASSWORD=votre-mot-de-passe-hivemq
MQTT_USE_TLS=true
```

> Mosquitto local n’est **plus nécessaire** avec un broker cloud.

### 4. Véhicule + simulateur

1. Dans l’app mobile (connectée à Render), le véhicule doit avoir :
   - **Device ID** : `SG-DEVICE-001` (valeur par défaut du simulateur)
2. Lancez le simulateur :
   ```powershell
   .\scripts\start-simulator.ps1 -Scenario normal
   ```
3. Attendez ~10 s → l’app affiche **En ligne**, vitesse, volts, moteur ON

### Schéma

```
Simulateur (PC) ──MQTT TLS──► HiveMQ Cloud ◄──MQTT TLS── API Render
                                      │
                              App mobile (HTTPS/WSS)
```

### Dépannage MQTT

| Symptôme | Cause probable |
|----------|----------------|
| Véhicule « Hors ligne » | `device_id` différent de `SG-DEVICE-001` |
| Simulateur OK, app offline | Variables MQTT pas identiques Render ↔ `.env` local |
| Erreur connexion simulateur | Mauvais user/password ou TLS désactivé |
| Données après redeploy Render | Normal si MQTT mal configuré — revérifiez `/health` |

---

## MQTT (ancienne section — résumé)

L’API démarre **sans** MQTT configuré. Auth et CRUD véhicules fonctionnent quand même.

Pour la position live, configurez un broker externe comme ci-dessus (HiveMQ Cloud recommandé).

---

## Disque persistant (photos profil — plan Starter+)

Dans `render.yaml`, décommentez la section `disk` et ajoutez :

```yaml
- key: UPLOADS_DIR
  value: /var/data/uploads
```

Puis redeploy.

---

## Dépannage

### Build échoue
- Vérifiez **Root Directory** = `backend`
- `PYTHON_VERSION=3.12.7`

### Migration Alembic échoue
- `DATABASE_URL` bien liée à la base Render
- Logs : Render Dashboard → service → **Logs**

### 502 / timeout au démarrage
- Cold start normal sur free — réessayez après 1 min
- Health check : `/health`

### Mobile « Network request failed »
- URL en `https://` (pas `http://`)
- WebSocket en `wss://` (pas `ws://`)
- Relancez Expo après changement de `.env`

---

## Fichiers ajoutés

| Fichier | Rôle |
|---------|------|
| `render.yaml` | Blueprint Render (API + Postgres) |
| `backend/app/mqtt/common.py` | Options MQTT partagées (TLS + auth) |
| `backend/scripts/render-start.sh` | Migrations + uvicorn production |
| `backend/.python-version` | Python 3.12.7 |
| `backend/app/core/config.py` | Normalisation `DATABASE_URL` Render |
| `mobile/.env.production.example` | Template URL cloud pour Expo |

---

## Prochaines étapes (optionnel)

- [ ] Domaine custom (`api.votredomaine.com`)
- [ ] Stockage S3 pour avatars (production durable)
- [ ] CI/CD GitHub Actions → deploy auto
- [ ] Build APK avec URL production figée
