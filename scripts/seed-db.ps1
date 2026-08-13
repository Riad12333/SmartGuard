# SmartGuard - migrations Alembic (sans donnees de demo)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"

Write-Host "SmartGuard - migrations base de donnees" -ForegroundColor Cyan
Set-Location $BackendDir

python -m pip install -r requirements.txt -q
python -m alembic upgrade head
python scripts/seed_db.py
