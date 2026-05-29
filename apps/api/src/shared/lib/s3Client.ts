import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

type S3Bundle = { client: S3Client; bucket: string; endpoint: string }

let cached: S3Bundle | null = null

// Ленивая инициализация: env читаются и валидируются при первом вызове uploadToS3,
// а не на импорте модуля. Иначе баррель shared/lib тянул бы S3 в любой импорт
// (токены, config) и падал бы в тестах без S3-env.
function getS3(): S3Bundle {
  if (cached) return cached

  const endpoint = process.env.YANDEX_S3_ENDPOINT
  const bucket = process.env.YANDEX_S3_BUCKET
  const accessKeyId = process.env.YANDEX_S3_ACCESS_KEY
  const secretAccessKey = process.env.YANDEX_S3_SECRET_KEY

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'S3 env vars are missing: YANDEX_S3_ENDPOINT, YANDEX_S3_BUCKET, YANDEX_S3_ACCESS_KEY, YANDEX_S3_SECRET_KEY',
    )
  }

  const client = new S3Client({
    endpoint,
    region: 'ru-central1',
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })

  cached = { client, bucket, endpoint }
  return cached
}

export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const { client, bucket, endpoint } = getS3()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
    }),
  )
  return `${endpoint}/${bucket}/${key}`
}
