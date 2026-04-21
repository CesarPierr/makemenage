#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env.production ]]; then
  echo ".env.production is missing. Copy .env.production.example and fill the values first."
  exit 1
fi

sg docker -c "cd '$ROOT_DIR' && docker compose --env-file .env.production -f docker-compose.prod.yml pull || true"
sg docker -c "cd '$ROOT_DIR' && docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build"
