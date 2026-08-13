#!/usr/bin/env bash
# Démarrage production Render — migrations puis uvicorn (sans --reload)
set -euo pipefail

cd "$(dirname "$0")/.."

echo "SmartGuard — migration Alembic..."
python -m alembic upgrade head

echo "SmartGuard — démarrage API sur le port ${PORT:-8000}..."
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
