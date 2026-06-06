import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/shared', () => ({
  authFetch: vi.fn(),
  apiErrorMessage: vi.fn().mockResolvedValue('upload failed'),
}))

import { authFetch } from '@/shared'
import AdminImageUploader from './AdminImageUploader.vue'

const mockAuthFetch = vi.mocked(authFetch)

function setFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true })
}

describe('AdminImageUploader', () => {
  beforeEach(() => mockAuthFetch.mockReset())

  it('загружает выбранный файл и эмитит обновлённый список', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://s3/items/new/a.png' }),
    } as Response)

    const wrapper = mount(AdminImageUploader, { props: { modelValue: [] } })
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    setFiles(input, [new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })])
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()

    expect(mockAuthFetch).toHaveBeenCalledWith('/admin/products/images', expect.objectContaining({ method: 'POST' }))
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted![emitted!.length - 1][0]).toEqual(['https://s3/items/new/a.png'])
  })

  it('пропускает файл неподдерживаемого типа и показывает ошибку', async () => {
    const wrapper = mount(AdminImageUploader, { props: { modelValue: [] } })
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    setFiles(input, [new File([new Uint8Array([1])], 'a.pdf', { type: 'application/pdf' })])
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()

    expect(mockAuthFetch).not.toHaveBeenCalled()
    expect(wrapper.find('.image-uploader__error').exists()).toBe(true)
  })

  it('удаляет картинку из списка', async () => {
    const wrapper = mount(AdminImageUploader, { props: { modelValue: ['a.png', 'b.png'] } })
    await wrapper.findAll('.image-uploader__remove')[0]!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted![0][0]).toEqual(['b.png'])
  })

  it('первая картинка помечена как Main', () => {
    const wrapper = mount(AdminImageUploader, { props: { modelValue: ['a.png', 'b.png'] } })
    expect(wrapper.find('.image-uploader__main').text()).toBe('Main')
    expect(wrapper.findAll('.image-uploader__main')).toHaveLength(1)
  })

  it('не превышает лимит в 10 картинок', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://s3/new.png' }),
    } as Response)

    const nine = Array.from({ length: 9 }, (_, i) => `img${i}.png`)
    const wrapper = mount(AdminImageUploader, { props: { modelValue: nine } })
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    setFiles(input, [
      new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }),
      new File([new Uint8Array([1])], 'b.png', { type: 'image/png' }),
      new File([new Uint8Array([1])], 'c.png', { type: 'image/png' }),
    ])
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()

    expect(mockAuthFetch).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.image-uploader__error').text()).toContain('Maximum 10')
  })

  it('показывает ошибку при сетевом сбое и ничего не эмитит', async () => {
    mockAuthFetch.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response)

    const wrapper = mount(AdminImageUploader, { props: { modelValue: [] } })
    const input = wrapper.find('input[type="file"]').element as HTMLInputElement
    setFiles(input, [new File([new Uint8Array([1])], 'a.png', { type: 'image/png' })])
    await wrapper.find('input[type="file"]').trigger('change')
    await flushPromises()

    expect(wrapper.find('.image-uploader__error').exists()).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
