#!/bin/sh
set -eu

mkdir -p /app/data/backups \
  /app/data/backups-redundante \
  /app/data/backups-tmp \
  /app/data/outbox \
  /app/data/vault/copias \
  /app/data/vault/punto-limpio \
  /app/data/vault/offline \
  /app/data/plantillas

if [ ! -f /app/data/esquema.json ] && [ -f /app/seed/esquema.json ]; then
  cp /app/seed/esquema.json /app/data/esquema.json
fi

if [ ! -f /app/data/calendario_seed.json ] && [ -f /app/seed/calendario_seed.json ]; then
  cp /app/seed/calendario_seed.json /app/data/calendario_seed.json
fi

# Nunca sobrescribir una base existente (ni si solo queda el WAL).
if [ ! -f /app/data/juzgado.db ] && [ ! -f /app/data/juzgado.db-wal ] && [ -f /app/seed/juzgado.db ]; then
  cp /app/seed/juzgado.db /app/data/juzgado.db
fi

if [ -d /app/seed/plantillas ]; then
  for f in /app/seed/plantillas/*; do
    [ -f "$f" ] || continue
    base=$(basename "$f")
    if [ ! -f "/app/data/plantillas/$base" ]; then
      cp "$f" "/app/data/plantillas/$base"
    fi
  done
fi

exec node server.js
