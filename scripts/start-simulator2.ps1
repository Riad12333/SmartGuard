# SmartGuard - lancement simulateur 2 (Peugeot 308 — Bab Ezzouar)

param(
    [string]$Scenario = "normal",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SimulatorDir = Join-Path $ProjectRoot "simulator"

Write-Host "SmartGuard Vehicle Simulator 2 — Peugeot 308 (Bab Ezzouar)" -ForegroundColor Cyan

Set-Location $SimulatorDir

python -m pip install -r requirements.txt -q

$args_list = @("--profile", "2", "--scenario", $Scenario)
if ($DryRun) {
    $args_list += "--dry-run"
    Write-Host "Mode dry-run (sans Mosquitto)" -ForegroundColor Yellow
} else {
    Write-Host "Broker MQTT: localhost:1883" -ForegroundColor Gray
    Write-Host "Device: SG-DEVICE-002" -ForegroundColor Gray
    Write-Host "Assurez-vous que Mosquitto est demarre." -ForegroundColor Yellow
}

Write-Host "Scenario: $Scenario" -ForegroundColor Green
python main.py @args_list
