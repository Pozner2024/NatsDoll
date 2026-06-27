import { describe, it, expect, vi } from 'vitest'
import { makeGetPaymentSettings } from './getPaymentSettings'

function repo(settings: unknown) {
  return { getSettings: vi.fn().mockResolvedValue(settings) }
}

describe('getPaymentSettings', () => {
  it('нет настроек → дефолты, hasSecret:false', async () => {
    const uc = makeGetPaymentSettings(repo(null) as never)
    expect(await uc()).toEqual({ enabled: false, mode: 'SANDBOX', clientId: null, hasSecret: false, webhookId: null })
  })

  it('есть secret → hasSecret:true, но сам secret не отдаётся; webhookId пробрасывается', async () => {
    const uc = makeGetPaymentSettings(repo({ enabled: true, mode: 'LIVE', clientId: 'cid', secret: 'enc-secret', webhookId: 'WH-1' }) as never)
    const view = await uc()
    expect(view).toEqual({ enabled: true, mode: 'LIVE', clientId: 'cid', hasSecret: true, webhookId: 'WH-1' })
    expect(JSON.stringify(view)).not.toContain('enc-secret')
  })

  it('secret пуст → hasSecret:false', async () => {
    const uc = makeGetPaymentSettings(repo({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: null, webhookId: null }) as never)
    expect((await uc()).hasSecret).toBe(false)
  })
})
