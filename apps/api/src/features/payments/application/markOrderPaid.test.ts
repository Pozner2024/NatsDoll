import { describe, it, expect, vi } from 'vitest'
import { makeMarkOrderPaid } from './markOrderPaid'

describe('markOrderPaid', () => {
  it('delegates to repository with orderId and captureId', async () => {
    const repo = { markOrderPaid: vi.fn().mockResolvedValue(undefined) }
    const markPaid = makeMarkOrderPaid(repo as never)
    await markPaid('order-1', 'CAP-1')
    expect(repo.markOrderPaid).toHaveBeenCalledWith('order-1', 'CAP-1')
  })
})
