import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../adminPaymentApi', () => ({
  fetchPaymentSettings: vi.fn(),
  savePaymentSettings: vi.fn(),
}))

import { fetchPaymentSettings, savePaymentSettings } from '../adminPaymentApi'
import AdminPaymentSettings from './AdminPaymentSettings.vue'

const mockFetch = vi.mocked(fetchPaymentSettings)
const mockSave = vi.mocked(savePaymentSettings)

const loaded = {
  enabled: true,
  mode: 'SANDBOX' as const,
  sandbox: { clientId: 'sb-cid', hasSecret: true, webhookId: 'WH-SB' },
  live: { clientId: 'lv-cid', hasSecret: false, webhookId: null },
}

function clone() {
  return JSON.parse(JSON.stringify(loaded))
}

async function mountLoaded() {
  mockFetch.mockResolvedValue(clone())
  mockSave.mockResolvedValue(clone())
  const wrapper = mount(AdminPaymentSettings)
  await flushPromises()
  return wrapper
}

describe('AdminPaymentSettings', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockSave.mockReset()
  })

  it('загружает обе секции и при сохранении не трогает заданные secret (пустые поля → undefined)', async () => {
    const wrapper = await mountLoaded()
    const sections = wrapper.findAll('.payment-settings__section')
    expect(sections).toHaveLength(2)
    expect((sections[0]!.find('input[type="text"]').element as HTMLInputElement).value).toBe('sb-cid')
    expect((sections[1]!.find('input[type="text"]').element as HTMLInputElement).value).toBe('lv-cid')

    await wrapper.find('.payment-settings__save').trigger('click')
    await flushPromises()

    expect(mockSave).toHaveBeenCalledWith({
      enabled: true,
      mode: 'SANDBOX',
      sandbox: { clientId: 'sb-cid', secret: undefined, webhookId: 'WH-SB' },
      live: { clientId: 'lv-cid', secret: undefined, webhookId: null },
    })
  })

  it('переключение активного режима не стирает ключи другой секции', async () => {
    const wrapper = await mountLoaded()
    await wrapper.find('select').setValue('LIVE')

    await wrapper.find('.payment-settings__save').trigger('click')
    await flushPromises()

    const body = mockSave.mock.calls[0]![0]
    expect(body.mode).toBe('LIVE')
    expect(body.sandbox.clientId).toBe('sb-cid')
    expect(body.live.clientId).toBe('lv-cid')
  })

  it('новый secret для live отправляется, а отметка «удалить» у sandbox шлёт null', async () => {
    const wrapper = await mountLoaded()
    const sections = wrapper.findAll('.payment-settings__section')

    // live: вводим новый secret
    await sections[1]!.find('input[type="password"]').setValue('new-live-secret')
    // sandbox: отмечаем «удалить сохранённый Secret» (чекбокс есть, т.к. hasSecret=true)
    await sections[0]!.find('input[type="checkbox"]').setValue(true)

    await wrapper.find('.payment-settings__save').trigger('click')
    await flushPromises()

    const body = mockSave.mock.calls[0]![0]
    expect(body.sandbox.secret).toBeNull()
    expect(body.live.secret).toBe('new-live-secret')
  })
})
