#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting SmartGuard API..."
PORT="${PORT:-8000}"
if [ "${DEBUG:-false}" = "true" ]; then
  exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload
fi
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
