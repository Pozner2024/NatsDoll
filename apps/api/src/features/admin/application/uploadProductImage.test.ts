import { describe, it, expect, vi } from 'vitest'
import { makeUploadProductImage } from './uploadProductImage'

describe('uploadProductImage', () => {
  it('генерирует ключ items/new/<uuid>.jpg и возвращает url', async () => {
    const upload = vi.fn().mockResolvedValue('https://s3/natsdoll/items/new/x.jpg')
    const bytes = new Uint8Array([1, 2, 3])

    const result = await makeUploadProductImage(upload)({ bytes, contentType: 'image/jpeg' })

    expect(upload).toHaveBeenCalledOnce()
    const [key, body, contentType] = upload.mock.calls[0]!
    expect(key).toMatch(/^items\/new\/[0-9a-f-]+\.jpg$/)
    expect(body).toBe(bytes)
    expect(contentType).toBe('image/jpeg')
    expect(result).toEqual({ url: 'https://s3/natsdoll/items/new/x.jpg' })
  })

  it('маппит contentType в расширение', async () => {
    const upload = vi.fn().mockResolvedValue('url')
    await makeUploadProductImage(upload)({ bytes: new Uint8Array(), contentType: 'image/webp' })
    expect(upload.mock.calls[0]![0]).toMatch(/\.webp$/)
  })

  it('бросает 400 на неподдерживаемый тип', async () => {
    const upload = vi.fn()
    await expect(
      makeUploadProductImage(upload)({ bytes: new Uint8Array(), contentType: 'application/pdf' }),
    ).rejects.toThrow('Unsupported file type')
    expect(upload).not.toHaveBeenCalled()
  })
})
