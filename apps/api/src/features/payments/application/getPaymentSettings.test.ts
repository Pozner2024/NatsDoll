import { describe, it, expect, vi } from 'vitest'
import { makeGetPaymentSettings } from './getPaymentSettings'

function repo(settings: unknown) {
  return { getSettings: vi.fn().mockResolvedValue(settings) }
}

describe('getPaymentSettings', () => {
  it('нет настроек → дефолты, hasSecret:false', async () => {
    const uc = makeGetPaymentSettings(repo(null) as never)
    expect(await uc()).toEqual({ enabled: false, mode: 'SANDBOX', clientId: null, hasSecret: false })
  })

  it('есть secret → hasSecret:true, но сам secret не отдаётся', async () => {
    const uc = makeGetPaymentSettings(repo({ enabled: true, mode: 'LIVE', clientId: 'cid', secret: 'enc-secret' }) as never)
    const view = await uc()
    expect(view).toEqual({ enabled: true, mode: 'LIVE', clientId: 'cid', hasSecret: true })
    expect(JSON.stringify(view)).not.toContain('enc-secret')
  })

  it('secret пуст → hasSecret:false', async () => {
    const uc = makeGetPaymentSettings(repo({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: null }) as never)
    expect((await uc()).hasSecret).toBe(false)
  })
})
