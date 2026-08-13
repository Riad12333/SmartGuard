# SmartGuard - vider la base (utilisateurs, vehicules, trackers)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"

Write-Host "SmartGuard - nettoyage base de donnees" -ForegroundColor Cyan
Set-Location $BackendDir

python -m pip install -r requirements.txt -q
python scripts/clean_db.py
