import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { AppError } from '../errors'

type S3Bundle = { client: S3Client; bucket: string; endpoint: string }

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/
const S3_CONNECTION_TIMEOUT_MS = 3000
const S3_REQUEST_TIMEOUT_MS = 10000
const S3_MAX_ATTEMPTS = 3

let cached: S3Bundle | null = null

function assertValidUpload(key: string, body: Buffer | Uint8Array, contentType: string): void {
  if (!KEY_PATTERN.test(key) || key.includes('..')) {
    throw new AppError(400, 'Invalid upload key')
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new AppError(400, 'Unsupported file type')
  }
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    throw new AppError(400, 'File is too large')
  }
}

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
    maxAttempts: S3_MAX_ATTEMPTS,
    requestHandler: new NodeHttpHandler({
      connectionTimeout: S3_CONNECTION_TIMEOUT_MS,
      requestTimeout: S3_REQUEST_TIMEOUT_MS,
    }),
  })

  cached = { client, bucket, endpoint }
  return cached
}

export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  assertValidUpload(key, body, contentType)
  const { client, bucket, endpoint } = getS3()
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read',
      }),
    )
  } catch (err) {
    console.error('[s3] upload failed:', err)
    throw new AppError(503, 'Image storage is temporarily unavailable. Please try again later.')
  }
  return `${endpoint}/${bucket}/${key}`
}
