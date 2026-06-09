#!/bin/bash
# Carga los eventos de un festival en el backend
# Uso: API_URL=https://... API_KEY=... ./data/load.sh san-bernabe-2026

FESTIVAL=${1:-san-bernabe-2026}
API_URL=${API_URL:-http://localhost:3000}
API_KEY=${API_KEY:-}

if [ -z "$API_KEY" ]; then
  echo "ERROR: API_KEY env var required"
  exit 1
fi

echo "Deleting existing events for $FESTIVAL..."
curl -s -X DELETE "$API_URL/api/events?festival=$FESTIVAL" \
  -H "x-api-key: $API_KEY" | python3 -m json.tool

echo "Loading events from data/$FESTIVAL.json..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
curl -s -X POST "$API_URL/api/events/load" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"events\": $(cat "$SCRIPT_DIR/$FESTIVAL.json")}" | python3 -m json.tool

echo "Done!"
