#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting Consultant Copilot AI API on http://0.0.0.0:8000"
echo "Swagger UI: http://localhost:8000/docs"

uvicorn api:app --host 0.0.0.0 --port 8000 --reload
