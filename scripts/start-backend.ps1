# SmartGuard - lancement backend local (PostgreSQL)

param(
    [switch]$Migrate,
    [switch]$Seed,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"

Write-Host "SmartGuard - demarrage backend" -ForegroundColor Cyan

Set-Location $BackendDir

if (-not (Test-Path (Join-Path $ProjectRoot ".env"))) {
    Copy-Item (Join-Path $ProjectRoot ".env.example") (Join-Path $ProjectRoot ".env")
    Write-Host "Fichier .env cree depuis .env.example" -ForegroundColor Yellow
}

if (-not $SkipInstall) {
    Write-Host "Installation des dependances Python..."
    python -m pip install -r requirements.txt -q
}

if ($Migrate -or $Seed) {
    Write-Host "Migration Alembic..."
    python -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERREUR migration. PostgreSQL demarre ? Lancez .\scripts\setup-postgres.ps1" -ForegroundColor Red
        exit 1
    }
}

if ($Seed) {
    Write-Host "Seed (vide - pas de comptes demo)..."
    python scripts/seed_db.py
}

Write-Host "Demarrage API sur http://localhost:8000" -ForegroundColor Green
Write-Host "Documentation : http://localhost:8000/docs"
Write-Host "Inscrivez-vous via l app mobile pour creer votre compte" -ForegroundColor Yellow

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
