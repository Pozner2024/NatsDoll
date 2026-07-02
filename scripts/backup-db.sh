#!/usr/bin/env bash
# Бэкап PostgreSQL в Яндекс Object Storage (S3-совместимо).
# Запускается по расписанию из .github/workflows/backup.yml (SSH на прод).
# Креды берутся из корневого .env прода — в GitHub Secrets не дублируются.
#
# Требуется приватный бакет ($YANDEX_S3_BACKUP_BUCKET), ОТДЕЛЬНЫЙ от бакета картинок
# (тот может быть public-read). Ретеншн — через lifecycle-правило бакета на 30 дней
# (одноразовая настройка в консоли Object Storage), поэтому скрипт только заливает.
#
# Восстановление (на проде):
#   docker run --rm -e AK=$YANDEX_S3_ACCESS_KEY -e SK=$YANDEX_S3_SECRET_KEY \
#     -e EP=$YANDEX_S3_ENDPOINT --entrypoint /bin/sh minio/mc -c \
#     'mc alias set yc "$EP" "$AK" "$SK" >/dev/null && mc cat yc/'$YANDEX_S3_BACKUP_BUCKET'/db/<FILE>' \
#     | gunzip | docker compose -f docker-compose.prod.yml exec -T db psql -U $DB_USER -d $DB_NAME
set -euo pipefail

cd "$(dirname "$0")/.."

set -a
. ./.env
set +a

: "${DB_USER:?DB_USER not set}"
: "${DB_NAME:?DB_NAME not set}"
: "${YANDEX_S3_ACCESS_KEY:?not set}"
: "${YANDEX_S3_SECRET_KEY:?not set}"
: "${YANDEX_S3_ENDPOINT:?not set}"
: "${YANDEX_S3_BACKUP_BUCKET:?not set — приватный бакет, отдельный от картинок}"

TS="$(date -u +%Y%m%d-%H%M%SZ)"
FILE="natsdoll-${TS}.sql.gz"
TMP="/tmp/${FILE}"
trap 'rm -f "$TMP"' EXIT

echo "[backup] dumping ${DB_NAME}…"
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$DB_USER" --no-owner --no-privileges "$DB_NAME" | gzip -9 > "$TMP"

echo "[backup] dump $(du -h "$TMP" | cut -f1); uploading to ${YANDEX_S3_BACKUP_BUCKET}/db/${FILE}"
docker run --rm -v /tmp:/tmp \
  -e AK="$YANDEX_S3_ACCESS_KEY" -e SK="$YANDEX_S3_SECRET_KEY" \
  -e EP="$YANDEX_S3_ENDPOINT" -e BUCKET="$YANDEX_S3_BACKUP_BUCKET" -e FILE="$FILE" \
  --entrypoint /bin/sh minio/mc -c \
  'mc alias set yc "$EP" "$AK" "$SK" >/dev/null && mc cp "/tmp/$FILE" "yc/$BUCKET/db/$FILE"'

echo "[backup] done"
