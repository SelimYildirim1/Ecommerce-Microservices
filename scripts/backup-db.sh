#!/usr/bin/env bash
# Postgres yedekleme (Docker Compose).
# Kullanım: ./scripts/backup-db.sh [çıktı-dizini]
set -euo pipefail

OUT_DIR="${1:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
CONTAINER="${POSTGRES_CONTAINER:-ecommerce-postgres}"
USER_NAME="${POSTGRES_USER:-postgres}"

mkdir -p "$OUT_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "Konteyner çalışmıyor: $CONTAINER"
  exit 1
fi

# Tüm DB'leri ayrı dump'la (IdentityDb, CatalogDb, OrderDb yaygın isimler)
for DB in IdentityDb CatalogDb OrderDb PromotionDb ShippingDb; do
  FILE="${OUT_DIR}/${DB}_${STAMP}.sql.gz"
  echo "Dumping $DB -> $FILE"
  if docker exec "$CONTAINER" pg_dump -U "$USER_NAME" "$DB" 2>/dev/null | gzip > "$FILE"; then
    echo "  OK"
  else
    rm -f "$FILE"
    echo "  atlandı (db yok veya erişilemedi)"
  fi
done

echo "Bitti: $OUT_DIR"
