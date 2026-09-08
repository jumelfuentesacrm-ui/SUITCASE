#!/usr/bin/env bash
# ============================================================================
# MK2_PRT — reset de datos de demo entre presentaciones
#
# Corre supabase-demo-seed.sql contra el ÚNICO proyecto de Supabase de la
# demo (no un cliente real). Requiere psql y una variable de entorno
# DEMO_DATABASE_URL apuntando a ese proyecto (Supabase → Project Settings →
# Database → Connection string → URI). No la pongas en .env.local del repo,
# expórtala en tu shell antes de correr esto:
#
#   export DEMO_DATABASE_URL="postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres"
#   npm run demo:reset
#
# Alternativa sin psql: pega el contenido de supabase-demo-seed.sql
# directamente en Supabase Dashboard → SQL Editor → Run.
# ============================================================================
set -euo pipefail

SEED_FILE="$(dirname "$0")/../supabase-demo-seed.sql"

if [ -z "${DEMO_DATABASE_URL:-}" ]; then
  echo "ERROR: falta DEMO_DATABASE_URL (connection string del proyecto de demo)." >&2
  echo "Ver comentario al inicio de scripts/demo-reset.sh, o corre" >&2
  echo "supabase-demo-seed.sql a mano en Supabase SQL Editor." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql no está instalado. Corre supabase-demo-seed.sql a mano" >&2
  echo "en Supabase Dashboard → SQL Editor → Run en su lugar." >&2
  exit 1
fi

echo "Reseteando datos de demo contra el proyecto en DEMO_DATABASE_URL..."
psql "$DEMO_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SEED_FILE"
echo "Listo. Verifica en Supabase Table Editor que no quedó dato del prospecto anterior."
