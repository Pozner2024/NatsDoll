import { describe, it, expect, vi } from 'vitest'
import { makeGetPaymentConfig } from './getPaymentConfig'

function repo(settings: unknown) {
  return { getSettings: vi.fn().mockResolvedValue(settings) }
}

describe('getPaymentConfig', () => {
  it('нет настроек → всё выключено', async () => {
    const uc = makeGetPaymentConfig(repo(null) as never)
    expect(await uc()).toEqual({ enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false })
  })

  it('настройки выключены → enabled:false и clientId скрыт', async () => {
    const uc = makeGetPaymentConfig(repo({ enabled: false, mode: 'LIVE', clientId: 'cid', secret: 'enc' }) as never)
    expect(await uc()).toEqual({ enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false })
  })

  it('включено + clientId + secret → serverFlow:true', async () => {
    const uc = makeGetPaymentConfig(repo({ enabled: true, mode: 'LIVE', clientId: 'cid', secret: 'enc' }) as never)
    expect(await uc()).toEqual({ enabled: true, clientId: 'cid', mode: 'LIVE', serverFlow: true })
  })

  it('включено без secret → serverFlow:false (client-режим)', async () => {
    const uc = makeGetPaymentConfig(repo({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: null }) as never)
    expect(await uc()).toEqual({ enabled: true, clientId: 'cid', mode: 'SANDBOX', serverFlow: false })
  })

  it('никогда не отдаёт сам secret в публичном конфиге', async () => {
    const uc = makeGetPaymentConfig(repo({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: 'super-secret' }) as never)
    expect(JSON.stringify(await uc())).not.toContain('super-secret')
  })
})
