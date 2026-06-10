import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { AppError } from '../../../shared/errors'
import type { UploadProductImage } from '../types'

const SUPPORTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
])

const MAX_IMAGE_WIDTH = 1200
const MAX_IMAGE_HEIGHT = 800
const WEBP_QUALITY = 85
const MAX_INPUT_PIXELS = 50_000_000

type UploadFn = (key: string, body: Uint8Array, contentType: string) => Promise<string>

async function processImage(bytes: Uint8Array): Promise<Uint8Array> {
  try {
    const buffer = await sharp(bytes, { animated: true, limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()
    return new Uint8Array(buffer)
  } catch (err) {
    console.error('[uploadProductImage] sharp failed:', err)
    throw new AppError(400, 'Invalid or corrupted image file')
  }
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
