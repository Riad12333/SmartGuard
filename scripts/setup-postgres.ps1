# SmartGuard - configuration PostgreSQL locale (sans Docker)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ProjectRoot ".env"

Write-Host "SmartGuard - configuration PostgreSQL" -ForegroundColor Cyan

# Charger les variables depuis .env si present
$pgUser = "smartguard"
$pgPassword = "smartguard_dev_password"
$pgDb = "smartguard"
$pgHost = "localhost"
$pgPort = "5432"

if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match "^POSTGRES_USER=(.+)$") { $pgUser = $matches[1].Trim() }
        if ($_ -match "^POSTGRES_PASSWORD=(.+)$") { $pgPassword = $matches[1].Trim() }
        if ($_ -match "^POSTGRES_DB=(.+)$") { $pgDb = $matches[1].Trim() }
        if ($_ -match "^POSTGRES_HOST=(.+)$") { $pgHost = $matches[1].Trim() }
        if ($_ -match "^POSTGRES_PORT=(.+)$") { $pgPort = $matches[1].Trim() }
    }
}

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "ERREUR: psql introuvable. Installez PostgreSQL pour Windows." -ForegroundColor Red
    Write-Host "Telechargement : https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host "Ajoutez le dossier bin PostgreSQL au PATH (ex: C:\Program Files\PostgreSQL\16\bin)" -ForegroundColor Yellow
    exit 1
}

Write-Host "Connexion PostgreSQL sur ${pgHost}:${pgPort}..."

$sqlCreateUser = @"
DO `$`$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$pgUser') THEN
        CREATE ROLE $pgUser WITH LOGIN PASSWORD '$pgPassword';
    END IF;
END
`$`$;
"@

$sqlCreateDb = @"
SELECT 'CREATE DATABASE $pgDb OWNER $pgUser'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$pgDb')\gexec
"@

# Executer en tant que postgres (Windows: souvent via peer ou mot de passe local)
Write-Host "Creation utilisateur '$pgUser'..."
& psql -U postgres -h $pgHost -p $pgPort -c $sqlCreateUser 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Note: connectez-vous manuellement si psql demande un mot de passe postgres." -ForegroundColor Yellow
    & psql -U postgres -h $pgHost -p $pgPort -c $sqlCreateUser
}

Write-Host "Creation base '$pgDb'..."
& psql -U postgres -h $pgHost -p $pgPort -c "CREATE DATABASE $pgDb OWNER $pgUser;" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Base '$pgDb' existe peut-etre deja — continuation." -ForegroundColor Yellow
}

& psql -U postgres -h $pgHost -p $pgPort -c "GRANT ALL PRIVILEGES ON DATABASE $pgDb TO $pgUser;" 2>$null

Write-Host ""
Write-Host "PostgreSQL pret." -ForegroundColor Green
Write-Host "DATABASE_URL=postgresql+asyncpg://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDb}"
Write-Host ""
Write-Host "Prochaines etapes :" -ForegroundColor Cyan
Write-Host "  1. Verifiez DATABASE_URL dans .env"
Write-Host "  2. .\scripts\start-backend.ps1 -Migrate -Seed"
