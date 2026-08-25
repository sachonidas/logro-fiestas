#!/usr/bin/env bash
#
# Backup de la base de datos. Pensado para cron; instalación y restauración
# documentadas en docs/deploy.md.
#
# Escribe primero a un fichero temporal y solo lo publica si el volcado pasa las
# comprobaciones. Así un fallo nunca sustituye a un backup bueno ni dispara la
# rotación que borraría los antiguos.
set -euo pipefail

PROJECT_DIR=${PROJECT_DIR:-/opt/logro-fiestas}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/logro-fiestas}
RETENTION_DAYS=${RETENTION_DAYS:-14}
# Una base recién creada ya ocupa bastante más que esto comprimida
MIN_BYTES=${MIN_BYTES:-1024}

compose() {
    docker compose --env-file "$PROJECT_DIR/.env.prod" \
        -f "$PROJECT_DIR/docker-compose.prod.yml" "$@"
}

fail() {
    echo "$(date -Is) ERROR $*" >&2
    exit 1
}

mkdir -p "$BACKUP_DIR"

target="$BACKUP_DIR/fiestas_$(date +%F_%H%M).sql.gz"
tmp="$target.partial"
trap 'rm -f "$tmp"' EXIT

# --clean --if-exists: el volcado se puede restaurar sobre una base existente
compose exec -T database \
    pg_dump -U fiestas -d fiestas --clean --if-exists \
    | gzip > "$tmp" || fail "pg_dump falló"

gzip -t "$tmp" || fail "el gzip está corrupto"

size=$(wc -c < "$tmp")
[ "$size" -ge "$MIN_BYTES" ] || fail "el volcado ocupa solo $size bytes"

# pg_dump escribe este marcador al terminar: si falta, se cortó a medias
if ! gunzip -c "$tmp" | tail -c 400 | grep -q 'PostgreSQL database dump complete'; then
    fail "el volcado está incompleto"
fi

mv "$tmp" "$target"
trap - EXIT

find "$BACKUP_DIR" -name 'fiestas_*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "$(date -Is) OK $target ($(du -h "$target" | cut -f1))"
