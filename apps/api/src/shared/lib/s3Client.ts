import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const endpoint = process.env.YANDEX_S3_ENDPOINT
const bucket = process.env.YANDEX_S3_BUCKET
const accessKeyId = process.env.YANDEX_S3_ACCESS_KEY
const secretAccessKey = process.env.YANDEX_S3_SECRET_KEY

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  throw new Error(
    'S3 env vars are missing: YANDEX_S3_ENDPOINT, YANDEX_S3_BUCKET, YANDEX_S3_ACCESS_KEY, YANDEX_S3_SECRET_KEY',
  )
}

export const s3 = new S3Client({
  endpoint,
  region: 'ru-central1',
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
})

export const S3_BUCKET = bucket
export const S3_ENDPOINT = endpoint

export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
    }),
  )
  return `${S3_ENDPOINT}/${S3_BUCKET}/${key}`
}
