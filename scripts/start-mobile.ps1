# SmartGuard - lancement app mobile (Phase 4)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$MobileDir = Join-Path $ProjectRoot "mobile"

Write-Host "SmartGuard Mobile - Expo" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT pour telephone physique :" -ForegroundColor Yellow
Write-Host "  Modifiez mobile/.env avec l'IP de votre PC :" -ForegroundColor Yellow
Write-Host "  EXPO_PUBLIC_API_URL=http://192.168.x.x:8000" -ForegroundColor Yellow
Write-Host "  EXPO_PUBLIC_WS_URL=ws://192.168.x.x:8000" -ForegroundColor Yellow
Write-Host ""

Set-Location $MobileDir

if (-not (Test-Path "node_modules")) {
    Write-Host "Installation npm (premiere fois, peut prendre quelques minutes)..."
    npm install
}

Write-Host "Demarrage Expo (SDK 54)..." -ForegroundColor Green
Write-Host "  Scan QR avec Expo Go sur telephone" -ForegroundColor Gray
Write-Host "  Ne pas utiliser 'w' (web) - utilisez Expo Go Android/iOS" -ForegroundColor Yellow
npx expo start -c
