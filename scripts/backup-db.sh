#!/usr/bin/env bash
# Бэкап PostgreSQL в Яндекс Object Storage (S3-совместимо).
# Запускается по расписанию из .github/workflows/backup.yml (SSH на прод).
# Креды берутся из корневого .env прода — в GitHub Secrets не дублируются.
#
# Требуется приватный бакет ($YANDEX_S3_BACKUP_BUCKET), ОТДЕЛЬНЫЙ от бакета картинок
# (тот может быть public-read). Ретеншн — через lifecycle-правило бакета на 30 дней (выставлено 2026-10-16)
# (одноразовая настройка в консоли Object Storage), поэтому скрипт только заливает.
#
# Восстановление (на проде):
#   docker run --rm -e AWS_ACCESS_KEY_ID=$YANDEX_S3_ACCESS_KEY -e AWS_SECRET_ACCESS_KEY=$YANDEX_S3_SECRET_KEY \
#     -e AWS_DEFAULT_REGION=ru-central1 amazon/aws-cli:2.27.0 --endpoint-url $YANDEX_S3_ENDPOINT \
#     s3 cp s3://$YANDEX_S3_BACKUP_BUCKET/db/<FILE> - \
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

# Образ minio/mc удалён с Docker Hub (с 2026-10-10 бэкапы падали) — используем официальный aws-cli
# с зафиксированной версией. Проверку контрольных сумм aws-cli 2.23+ ограничиваем, иначе
# S3-совместимые хранилища могут отклонять загрузку.
AWS_CLI="amazon/aws-cli:2.27.0"
AWS_ENV=(-e AWS_ACCESS_KEY_ID="$YANDEX_S3_ACCESS_KEY" -e AWS_SECRET_ACCESS_KEY="$YANDEX_S3_SECRET_KEY"
  -e AWS_DEFAULT_REGION=ru-central1
  -e AWS_REQUEST_CHECKSUM_CALCULATION=when_required -e AWS_RESPONSE_CHECKSUM_VALIDATION=when_required)

TS="$(date -u +%Y%m%d-%H%M%SZ)"
FILE="natsdoll-${TS}.sql.gz"
TMP="/tmp/${FILE}"
trap 'rm -f "$TMP"' EXIT

echo "[backup] dumping ${DB_NAME}…"
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$DB_USER" --no-owner --no-privileges "$DB_NAME" | gzip -9 > "$TMP"

echo "[backup] dump $(du -h "$TMP" | cut -f1); uploading to ${YANDEX_S3_BACKUP_BUCKET}/db/${FILE}"
docker run --rm -v /tmp:/tmp "${AWS_ENV[@]}" "$AWS_CLI" \
  --endpoint-url "$YANDEX_S3_ENDPOINT" s3 cp "/tmp/$FILE" "s3://$YANDEX_S3_BACKUP_BUCKET/db/$FILE"

echo "[backup] done"
