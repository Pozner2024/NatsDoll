import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { AppError } from '../../../shared/errors'
import type { UploadProductImage } from '../types'

const SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
])

type UploadFn = (key: string, body: Uint8Array, contentType: string) => Promise<string>

async function processImage(bytes: Uint8Array): Promise<Uint8Array> {
  const buffer = await sharp(bytes)
    .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer()
  return new Uint8Array(buffer)
}

export function makeUploadProductImage(upload: UploadFn): UploadProductImage {
  return async ({ bytes, contentType }) => {
    if (!SUPPORTED_TYPES.has(contentType)) throw new AppError(400, 'Unsupported file type')
    const processed = await processImage(bytes)
    const key = `items/new/${randomUUID()}.webp`
    const url = await upload(key, processed, 'image/webp')
    return { url }
  }
}
