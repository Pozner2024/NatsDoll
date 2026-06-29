import { describe, it, expect, vi } from 'vitest'
import { makeGetPaymentSettings } from './getPaymentSettings'

function repo(settings: unknown) {
  return { getAdminSettings: vi.fn().mockResolvedValue(settings) }
}

describe('getPaymentSettings', () => {
  it('нет настроек → дефолты, обе секции пустые', async () => {
    const uc = makeGetPaymentSettings(repo(null) as never)
    expect(await uc()).toEqual({
      enabled: false,
      mode: 'SANDBOX',
      sandbox: { clientId: null, hasSecret: false, webhookId: null },
      live: { clientId: null, hasSecret: false, webhookId: null },
    })
  })

  it('секреты не отдаются, hasSecret вычисляется per-mode; webhookId пробрасывается', async () => {
    const uc = makeGetPaymentSettings(repo({
      enabled: true,
      mode: 'LIVE',
      sandboxClientId: 'sb', sandboxSecret: 'sb-enc', sandboxWebhookId: 'WH-SB',
      liveClientId: 'lv', liveSecret: null, liveWebhookId: null,
    }) as never)
    const view = await uc()
    expect(view).toEqual({
      enabled: true,
      mode: 'LIVE',
      sandbox: { clientId: 'sb', hasSecret: true, webhookId: 'WH-SB' },
      live: { clientId: 'lv', hasSecret: false, webhookId: null },
    })
    expect(JSON.stringify(view)).not.toContain('sb-enc')
  })
})
