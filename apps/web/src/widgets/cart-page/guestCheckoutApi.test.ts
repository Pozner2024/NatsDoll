import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGuestOrder, GuestEmailTakenError } from './guestCheckoutApi'
import * as shared from '@/shared'

vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared')>()
  return { ...actual, apiFetch: vi.fn() }
})

const setAuth = vi.fn()
vi.mock('@/entities/user', () => ({
  useAuthStore: vi.fn(() => ({ setAuth })),
}))

const reset = vi.fn()
vi.mock('@/entities/cart', () => ({
  useCartStore: vi.fn(() => ({ reset })),
}))

const input = {
  email: 'guest@example.com',
  shippingAddress: {
    fullName: 'Jane Doe',
    line1: '1 Main St',
    city: 'Town',
    country: 'US',
    postalCode: '00001',
  },
  items: [{ productId: 'p1', quantity: 1, message: null }],
}

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response
}

describe('createGuestOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs in WITHOUT merging the guest cart (items already moved to the order)', async () => {
    vi.mocked(shared.apiFetch).mockResolvedValue(
      jsonResponse(200, {
        order: { id: 'o1', orderNumber: 1001 },
        accessToken: 'tok',
        user: { id: 'u1', name: 'Jane', email: 'guest@example.com', role: 'CUSTOMER' },
      }),
    )

    const result = await createGuestOrder(input)

    expect(result).toEqual({ orderId: 'o1', orderNumber: 1001 })
    expect(reset).toHaveBeenCalledOnce()
    expect(setAuth).toHaveBeenCalledWith('tok', expect.objectContaining({ id: 'u1' }), { mergeGuestCart: false })
  })

  it('throws GuestEmailTakenError on 409 and does not sign in', async () => {
    vi.mocked(shared.apiFetch).mockResolvedValue(jsonResponse(409, {}))
    await expect(createGuestOrder(input)).rejects.toBeInstanceOf(GuestEmailTakenError)
    expect(reset).not.toHaveBeenCalled()
    expect(setAuth).not.toHaveBeenCalled()
  })
})
