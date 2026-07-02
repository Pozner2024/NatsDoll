// Разовая простановка Cache-Control на УЖЕ загруженные картинки в Object Storage.
// Новые загрузки получают заголовок из s3Client.ts; этот скрипт чинит старые объекты.
// Копирует объект «на себя» с MetadataDirective=REPLACE, СОХРАНЯЯ ContentType и ACL=public-read
// (иначе картинки стали бы приватными → 403 на сайте). Идемпотентен и перезапускаем.
//
// Запуск из apps/api (нужны YANDEX_S3_* в .env):
//   npm run backfill:image-cache -w apps/api
//   DRY_RUN=1 npm run backfill:image-cache -w apps/api   # только показать, ничего не менять
import pLimit from 'p-limit'
import { S3Client, ListObjectsV2Command, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3'

const CACHE_CONTROL = 'public, max-age=31536000, immutable'
const CONCURRENCY = 8
const DRY_RUN = process.env.DRY_RUN === '1'

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set`)
  return v
}

const bucket = env('YANDEX_S3_BUCKET')
const client = new S3Client({
  endpoint: env('YANDEX_S3_ENDPOINT'),
  region: 'ru-central1',
  credentials: { accessKeyId: env('YANDEX_S3_ACCESS_KEY'), secretAccessKey: env('YANDEX_S3_SECRET_KEY') },
  forcePathStyle: true,
})

function contentTypeFromExt(key: string): string | undefined {
  const ext = key.toLowerCase().split('.').pop()
  if (ext === 'webp') return 'image/webp'
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'avif') return 'image/avif'
  return undefined
}

// CopySource должен быть URL-кодирован, но слэши пути сохраняются.
function encodeCopySource(key: string): string {
  return `${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`
}

async function* listAllKeys(): AsyncGenerator<string> {
  let token: string | undefined
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }))
    for (const obj of res.Contents ?? []) {
      if (obj.Key) yield obj.Key
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)
}

async function backfillOne(key: string): Promise<'updated' | 'skipped'> {
  const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  if (head.CacheControl === CACHE_CONTROL) return 'skipped'
  if (DRY_RUN) return 'updated'
  await client.send(new CopyObjectCommand({
    Bucket: bucket,
    Key: key,
    CopySource: encodeCopySource(key),
    MetadataDirective: 'REPLACE',
    ContentType: head.ContentType ?? contentTypeFromExt(key),
    CacheControl: CACHE_CONTROL,
    ACL: 'public-read',
  }))
  return 'updated'
}

async function main(): Promise<void> {
  const limit = pLimit(CONCURRENCY)
  let updated = 0
  let skipped = 0
  let failed = 0
  const tasks: Promise<void>[] = []

  for await (const key of listAllKeys()) {
    tasks.push(limit(async () => {
      try {
        const result = await backfillOne(key)
        if (result === 'updated') {
          updated++
          console.log(`${DRY_RUN ? '[dry] ' : ''}✓ ${key}`)
        } else {
          skipped++
        }
      } catch (err) {
        failed++
        console.error(`✗ ${key}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }))
  }

  await Promise.all(tasks)
  console.log(`\nDone. updated=${updated} skipped=${skipped} failed=${failed}${DRY_RUN ? ' (DRY RUN — ничего не изменено)' : ''}`)
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err)
  process.exit(1)
})
