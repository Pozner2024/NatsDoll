import { describe, it, expect, vi } from 'vitest'
import { makeMarkOrderPaid } from './markOrderPaid'

describe('markOrderPaid', () => {
  it('delegates to repository with orderId and captureId and returns the paid outcome', async () => {
    const repo = { markOrderPaid: vi.fn().mockResolvedValue(true) }
    const markPaid = makeMarkOrderPaid(repo as never)
    const paid = await markPaid('order-1', 'CAP-1')
    expect(repo.markOrderPaid).toHaveBeenCalledWith('order-1', 'CAP-1')
    expect(paid).toBe(true)
  })
})
