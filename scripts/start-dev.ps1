# SmartGuard — demarrage complet pour dev mobile (telephone + Expo Go)
#
# Usage :
#   .\scripts\start-dev.ps1              # backend + Expo
#   .\scripts\start-dev.ps1 -Simulator   # + simulateur GPS
#   .\scripts\start-dev.ps1 -SkipBackend # Expo seulement (backend deja lance)

param(
    [switch]$Simulator,
    [switch]$SkipBackend,
    [switch]$NoMigrate,
    [string]$Scenario = "normal"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SmartGuard — mode developpement" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. IP locale -> mobile/.env
Write-Host "[1/3] Synchronisation IP -> mobile/.env" -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "sync-mobile-env.ps1")
Write-Host ""

# 2. Backend (nouvelle fenetre)
if (-not $SkipBackend) {
    Write-Host "[2/3] Demarrage backend (nouvelle fenetre)..." -ForegroundColor Yellow
    $backendArgs = @(
        "-NoExit"
        "-Command"
        "Set-Location '$ProjectRoot'; .\scripts\start-backend.ps1$(if (-not $NoMigrate) { ' -Migrate' })"
    )
    Start-Process powershell -ArgumentList $backendArgs | Out-Null
    Write-Host "  Attente demarrage API (5 s)..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
} else {
    Write-Host "[2/3] Backend ignore (-SkipBackend)" -ForegroundColor Gray
}

# 2b. Simulateur optionnel
if ($Simulator) {
    Write-Host "  Demarrage simulateur (nouvelle fenetre)..." -ForegroundColor Yellow
    $simArgs = @(
        "-NoExit"
        "-Command"
        "Set-Location '$ProjectRoot'; .\scripts\start-simulator.ps1 -Scenario $Scenario"
    )
    Start-Process powershell -ArgumentList $simArgs | Out-Null
}

Write-Host ""

# 3. Expo (fenetre actuelle)
Write-Host "[3/3] Demarrage Expo (scannez le QR avec Expo Go)" -ForegroundColor Yellow
Write-Host ""
Write-Host "RAPPEL :" -ForegroundColor DarkYellow
Write-Host "  - PC et telephone sur le MEME Wi-Fi" -ForegroundColor DarkYellow
Write-Host "  - Expo Go = mode DEV : le PC doit rester allume" -ForegroundColor DarkYellow
Write-Host "  - Pour utiliser sans PC : installez un APK ou deployez l'API en cloud" -ForegroundColor DarkYellow
Write-Host ""

& (Join-Path $PSScriptRoot "start-mobile.ps1")
