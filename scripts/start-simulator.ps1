# SmartGuard - lancement simulateur GPS (Phase 2)

param(
    [string]$Scenario = "normal",
    [ValidateSet("1", "2")]
    [string]$Profile = "1",
    [string]$DeviceId = "",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SimulatorDir = Join-Path $ProjectRoot "simulator"

Write-Host "SmartGuard Vehicle Simulator (profil $Profile)" -ForegroundColor Cyan

Set-Location $SimulatorDir

python -m pip install -r requirements.txt -q

$args_list = @("--profile", $Profile, "--scenario", $Scenario)
if ($DeviceId) {
    $args_list += @("--device-id", $DeviceId)
}
if ($DryRun) {
    $args_list += "--dry-run"
    Write-Host "Mode dry-run (sans Mosquitto)" -ForegroundColor Yellow
} else {
    $envPath = Join-Path $ProjectRoot ".env"
    $brokerHost = "localhost"
    $brokerPort = "1883"
    if (Test-Path $envPath) {
        Get-Content $envPath | ForEach-Object {
            if ($_ -match '^\s*MQTT_BROKER_HOST=(.+)$') { $brokerHost = $matches[1].Trim() }
            if ($_ -match '^\s*MQTT_BROKER_PORT=(.+)$') { $brokerPort = $matches[1].Trim() }
        }
    }
    Write-Host "Broker MQTT: ${brokerHost}:${brokerPort}" -ForegroundColor Gray
    if ($brokerHost -eq "localhost") {
        Write-Host "Assurez-vous que Mosquitto est demarre (ou configurez un broker cloud dans .env)." -ForegroundColor Yellow
    } else {
        Write-Host "Broker cloud - Mosquitto local non requis." -ForegroundColor Green
    }
}

Write-Host "Scenario: $Scenario" -ForegroundColor Green
python main.py @args_list
