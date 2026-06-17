import { describe, it, expect, vi } from 'vitest'
import { makeClaimPaypalPayment } from './claimPaypalPayment'

const base = { id: 'o1', userId: 'u1', orderNumber: 7, status: 'PENDING', totalAmount: 10, paypalOrderId: null }

describe('claimPaypalPayment', () => {
  it('records paypalOrderId when none is set yet', async () => {
    const repo = { getOrderForPayment: vi.fn().mockResolvedValue({ ...base }), setPaypalOrderId: vi.fn().mockResolvedValue(undefined) }
    const uc = makeClaimPaypalPayment(repo as never)
    await uc('u1', 'o1', 'PP-NEW')
    expect(repo.setPaypalOrderId).toHaveBeenCalledWith('o1', 'PP-NEW')
  })

  it('does not overwrite an existing paypalOrderId (anti-substitution)', async () => {
    const repo = { getOrderForPayment: vi.fn().mockResolvedValue({ ...base, paypalOrderId: 'PP-EXISTING' }), setPaypalOrderId: vi.fn() }
    const uc = makeClaimPaypalPayment(repo as never)
    await uc('u1', 'o1', 'PP-ATTACKER')
    expect(repo.setPaypalOrderId).not.toHaveBeenCalled()
  })

  it('rejects when order belongs to another user', async () => {
    const repo = { getOrderForPayment: vi.fn().mockResolvedValue({ ...base }), setPaypalOrderId: vi.fn() }
    const uc = makeClaimPaypalPayment(repo as never)
    await expect(uc('other', 'o1', 'PP')).rejects.toThrow()
    expect(repo.setPaypalOrderId).not.toHaveBeenCalled()
  })

  it('ignores claim when order is not PENDING', async () => {
    const repo = { getOrderForPayment: vi.fn().mockResolvedValue({ ...base, status: 'PAID' }), setPaypalOrderId: vi.fn() }
    const uc = makeClaimPaypalPayment(repo as never)
    await uc('u1', 'o1', 'PP')
    expect(repo.setPaypalOrderId).not.toHaveBeenCalled()
  })
})
