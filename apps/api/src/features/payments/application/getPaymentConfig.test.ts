import { describe, it, expect, vi } from 'vitest'
import { makeGetPaymentConfig } from './getPaymentConfig'

function repo(settings: unknown) {
  return { getSettings: vi.fn().mockResolvedValue(settings) }
}

describe('getPaymentConfig', () => {
  it('нет настроек → всё выключено', async () => {
    const uc = makeGetPaymentConfig(repo(null) as never)
    expect(await uc()).toEqual({ enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false, external: false })
  })

  it('настройки выключены → enabled:false и clientId скрыт', async () => {
    const uc = makeGetPaymentConfig(repo({ enabled: false, mode: 'LIVE', clientId: 'cid', secret: 'enc', externalPageEnabled: false }) as never)
    expect(await uc()).toEqual({ enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false, external: false })
  })

  it('включено + clientId + secret → serverFlow:true', async () => {
    const uc = makeGetPaymentConfig(repo({ enabled: true, mode: 'LIVE', clientId: 'cid', secret: 'enc', externalPageEnabled: false }) as never)
    expect(await uc()).toEqual({ enabled: true, clientId: 'cid', mode: 'LIVE', serverFlow: true, external: false })
  })

  it('включено без secret → serverFlow:false (client-режим)', async () => {
    const uc = makeGetPaymentConfig(repo({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: null, externalPageEnabled: false }) as never)
    expect(await uc()).toEqual({ enabled: true, clientId: 'cid', mode: 'SANDBOX', serverFlow: false, external: false })
  })

  it('никогда не отдаёт сам secret в публичном конфиге', async () => {
    const uc = makeGetPaymentConfig(repo({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: 'super-secret', externalPageEnabled: false }) as never)
    expect(JSON.stringify(await uc())).not.toContain('super-secret')
  })

  it('external-режим: clientId скрыт, external=true', async () => {
    const uc = makeGetPaymentConfig(repo({ enabled: true, mode: 'LIVE', clientId: 'cid', secret: 'enc', webhookId: null, externalPageEnabled: true }) as never)
    expect(await uc()).toEqual({ enabled: true, clientId: null, mode: 'LIVE', serverFlow: false, external: true })
  })
})
