# SmartGuard Mobile

Application React Native + Expo pour le suivi de vehicules en temps reel.

## Demarrage

```powershell
cd c:\Users\pc\Desktop\SmartGuard
.\scripts\start-mobile.ps1
```

Ou manuellement :

```powershell
cd mobile
npm install
npx expo start
```

## Configuration API

Editez `mobile/.env` :

```
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_WS_URL=ws://localhost:8000
```

**Telephone physique (Expo Go)** : remplacez `localhost` par l'IP LAN de votre PC, ex. :

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
EXPO_PUBLIC_WS_URL=ws://192.168.1.10:8000
```

## Ecrans

- Login / Register
- Home — liste des vehicules
- Detail — carte live + stats (vitesse, batterie, RPM...) via WebSocket

## Prerequis

- Node.js 18+
- Backend SmartGuard lance (`.\scripts\start-backend.ps1`)
- Simulateur optionnel pour positions live
