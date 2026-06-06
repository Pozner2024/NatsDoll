import { randomUUID } from 'node:crypto'
import { AppError } from '../../../shared/errors'
import type { UploadProductImage } from '../types'

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
}

type UploadFn = (key: string, body: Uint8Array, contentType: string) => Promise<string>

export function makeUploadProductImage(upload: UploadFn): UploadProductImage {
  return async ({ bytes, contentType }) => {
    const ext = EXT_BY_CONTENT_TYPE[contentType]
    if (!ext) throw new AppError(400, 'Unsupported file type')
    const key = `items/new/${randomUUID()}.${ext}`
    const url = await upload(key, bytes, contentType)
    return { url }
  }
}
