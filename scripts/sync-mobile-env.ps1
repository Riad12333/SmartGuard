# Met a jour mobile/.env avec l'IP locale du PC (Wi-Fi / Ethernet)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$MobileEnv = Join-Path $ProjectRoot "mobile\.env"

function Get-LocalLanIp {
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notmatch '^127\.' -and
            $_.IPAddress -notmatch '^169\.254\.' -and
            $_.PrefixOrigin -ne "WellKnown"
        } |
        Sort-Object -Property InterfaceMetric

    foreach ($addr in $candidates) {
        if ($addr.InterfaceAlias -match 'Wi-Fi|WLAN|Wireless|Ethernet|LAN') {
            return $addr.IPAddress
        }
    }

    if ($candidates) {
        return ($candidates | Select-Object -First 1).IPAddress
    }

    return $null
}

$ip = Get-LocalLanIp
if (-not $ip) {
    Write-Host "Impossible de detecter l'IP locale. Verifiez votre connexion Wi-Fi." -ForegroundColor Red
    exit 1
}

$apiUrl = "http://${ip}:8000"
$wsUrl = "ws://${ip}:8000"

$content = @(
    "EXPO_PUBLIC_API_URL=$apiUrl"
    "EXPO_PUBLIC_WS_URL=$wsUrl"
    ""
) -join "`n"

Set-Content -Path $MobileEnv -Value $content -Encoding UTF8

Write-Host "mobile/.env mis a jour :" -ForegroundColor Green
Write-Host "  EXPO_PUBLIC_API_URL=$apiUrl"
Write-Host "  EXPO_PUBLIC_WS_URL=$wsUrl"
