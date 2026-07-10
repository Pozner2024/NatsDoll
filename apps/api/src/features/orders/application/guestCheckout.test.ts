import { describe, it, expect, vi } from 'vitest'
import { makeGuestCheckout } from './guestCheckout'

const product = { id: 'p1', name: 'Doll', price: 16, stock: 5, isPublished: true, deletedAt: null, categoryId: 'c1' }
const address = { fullName: 'Anna', line1: '1 St', city: 'NY', country: 'US', postalCode: '10001' }
const order = { id: 'o1', orderNumber: 7, userId: 'u1', status: 'PENDING', totalAmount: 28, shippingCost: 12, shippingAddress: address, trackingNumber: null, createdAt: '2026-06-27T00:00:00Z', paymentClaimed: false, isGuestAccount: true, items: [] }

function deps() {
  return {
    orderRepo: { createOrderFromItems: vi.fn().mockResolvedValue(order) },
    getActiveSale: vi.fn().mockResolvedValue(null),
    getProductsForCheckout: vi.fn().mockResolvedValue([product]),
    authRepo: {
      findByEmail: vi.fn().mockResolvedValue(null),
      createGuestUser: vi.fn().mockResolvedValue({ id: 'u1', name: 'Anna', email: 'a@b.com', role: 'CUSTOMER' }),
      saveRefreshToken: vi.fn(), pruneUserSessions: vi.fn(),
    },
    issueTokens: vi.fn().mockResolvedValue({ accessToken: 'AT', refreshToken: 'RT', user: { id: 'u1', name: 'Anna', email: 'a@b.com', role: 'CUSTOMER' } }),
    emailService: { sendOrderConfirmation: vi.fn(), sendNewOrderAlert: vi.fn() },
    getShippingRates: vi.fn().mockResolvedValue({ baseCost: 12, perExtraItemCost: 1 }),
  }
}
function make(d: ReturnType<typeof deps>) {
  return makeGuestCheckout(d.orderRepo as never, d.getActiveSale as never, d.getProductsForCheckout as never, d.authRepo as never, d.issueTokens as never, d.emailService as never, d.getShippingRates as never)
}

describe('guestCheckout', () => {
  it('creates a guest user, an order, and issues a session for a brand-new email', async () => {
    const d = deps()
    const res = await make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'p1', quantity: 1, message: null }] })
    expect(d.authRepo.createGuestUser).toHaveBeenCalledWith({ name: 'Anna', email: 'a@b.com' })
    expect(d.orderRepo.createOrderFromItems).toHaveBeenCalled()
    expect(res.tokens.accessToken).toBe('AT')
    expect(d.emailService.sendOrderConfirmation).toHaveBeenCalledWith('a@b.com', 'Anna', 7, [], 28)
  })

  it('ADMIN_EMAIL задан → отправляет алерт админу', async () => {
    process.env.ADMIN_EMAIL = 'admin@natsdoll.com'
    const d = deps()
    await make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'p1', quantity: 1, message: null }] })
    expect(d.emailService.sendNewOrderAlert).toHaveBeenCalledWith('admin@natsdoll.com', 7, 'a@b.com', 28)
    delete process.env.ADMIN_EMAIL
  })

  it('rejects with 409 when the email belongs to a real account (has password)', async () => {
    const d = deps()
    d.authRepo.findByEmail.mockResolvedValue({ id: 'u9', email: 'a@b.com', passwordHash: 'h', googleId: null })
    await expect(make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'p1', quantity: 1, message: null }] })).rejects.toThrow()
    expect(d.orderRepo.createOrderFromItems).not.toHaveBeenCalled()
    expect(d.issueTokens).not.toHaveBeenCalled()
  })

  it('rejects with 409 for a Google-only account', async () => {
    const d = deps()
    d.authRepo.findByEmail.mockResolvedValue({ id: 'u9', email: 'a@b.com', passwordHash: null, googleId: 'g1' })
    await expect(make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'p1', quantity: 1, message: null }] })).rejects.toThrow()
    expect(d.orderRepo.createOrderFromItems).not.toHaveBeenCalled()
    expect(d.issueTokens).not.toHaveBeenCalled()
  })

  it('NEVER issues a session into or places an order under an existing passwordless guest account', async () => {
    const d = deps()
    d.authRepo.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Anna', passwordHash: null, googleId: null })
    await expect(make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'p1', quantity: 1, message: null }] })).rejects.toThrow()
    expect(d.orderRepo.createOrderFromItems).not.toHaveBeenCalled()
    expect(d.issueTokens).not.toHaveBeenCalled()
    expect(d.authRepo.createGuestUser).not.toHaveBeenCalled()
  })

  it('rejects an empty cart', async () => {
    const d = deps()
    await expect(make(d)({ email: 'a@b.com', shippingAddress: address, items: [] })).rejects.toThrow()
  })

  it('rejects when stock is insufficient', async () => {
    const d = deps()
    await expect(make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'p1', quantity: 99, message: null }] })).rejects.toThrow()
    expect(d.orderRepo.createOrderFromItems).not.toHaveBeenCalled()
  })

  it('ignores unknown products in the request', async () => {
    const d = deps()
    await expect(make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'ghost', quantity: 1, message: null }] })).rejects.toThrow()
  })
})
