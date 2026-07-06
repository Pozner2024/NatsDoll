import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeCreateOrder } from './createOrder'
import type { OrderRepository, ShippingAddress } from '../types'
import type { GetActiveSale } from '../../admin/types'
import type { AuthRepository } from '../../auth/infrastructure/authRepository'
import type { EmailService } from '../../auth/infrastructure/emailService'

const noActiveSale: GetActiveSale = vi.fn().mockResolvedValue(null)

const address: ShippingAddress = {
  fullName: 'Natasha',
  line1: '123 Main St',
  city: 'New York',
  country: 'US',
  postalCode: '10001',
}

function makeRepo(): OrderRepository {
  return {
    getCartItemsForCheckout: vi.fn(),
    createOrderFromCart: vi.fn(),
    createOrderFromItems: vi.fn(),
    getMyOrders: vi.fn(),
    getOrderById: vi.fn(),
    getProductsForCheckout: vi.fn(),
    cancelPendingOrder: vi.fn(),
  }
}

function makeAuthRepo(): Pick<AuthRepository, 'findById'> {
  return { findById: vi.fn().mockResolvedValue({ id: 'u1', name: 'Natasha', email: 'natasha@example.com' }) }
}

function makeEmailService(): EmailService {
  return {
    sendVerificationEmail: vi.fn(),
    sendAccountExistsEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    sendMessageNotification: vi.fn(),
    sendTrackingNotification: vi.fn(),
    sendContactNotification: vi.fn(),
    sendPaymentCaptureAlert: vi.fn(),
    sendOrderConfirmation: vi.fn(),
    sendNewOrderAlert: vi.fn(),
  }
}

describe('createOrder', () => {
  let repo: OrderRepository
  let authRepo: Pick<AuthRepository, 'findById'>
  let emailService: EmailService

  beforeEach(() => {
    repo = makeRepo()
    authRepo = makeAuthRepo()
    emailService = makeEmailService()
  })

  afterEach(() => {
    delete process.env.ADMIN_EMAIL
  })

  it('throws 400 when cart is empty', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([])
    const createOrder = makeCreateOrder(repo, noActiveSale, authRepo, emailService)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 409 when a product is unavailable', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: false, quantity: 1, message: null, categoryId: 'cat1' },
    ])
    const createOrder = makeCreateOrder(repo, noActiveSale, authRepo, emailService)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 409 when stock is insufficient', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 2, productIsAvailable: true, quantity: 5, message: null, categoryId: 'cat1' },
    ])
    const createOrder = makeCreateOrder(repo, noActiveSale, authRepo, emailService)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('passes computed shippingCost to createOrderFromCart', async () => {
    const items = [
      { id: 'ci-1', productId: 'p1', productName: 'A', productImage: null,
        productPrice: 15, productStock: 10, productIsAvailable: true, quantity: 2, message: null, categoryId: 'cat1' },
      { id: 'ci-2', productId: 'p2', productName: 'B', productImage: null,
        productPrice: 20, productStock: 5, productIsAvailable: true, quantity: 1, message: 'Hi', categoryId: 'cat2' },
    ]
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue(items)
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', orderNumber: 1, userId: 'u1', status: 'PENDING',
      totalAmount: 64, shippingCost: 14, trackingNumber: null,
      shippingAddress: address, createdAt: new Date().toISOString(), paymentClaimed: false, isGuestAccount: false, items: [],
    })
    const createOrder = makeCreateOrder(repo, noActiveSale, authRepo, emailService)
    await createOrder('u1', address)
    // totalItemCount = 3, shipping = 12 + 2 = 14 (total пересчитывается в репозитории внутри транзакции)
    expect(repo.createOrderFromCart).toHaveBeenCalledWith('u1', items, 14, address, null)
  })

  it('calculates shipping correctly for 1 item', async () => {
    const items = [
      { id: 'ci-1', productId: 'p1', productName: 'A', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: true, quantity: 1, message: null, categoryId: 'cat1' },
    ]
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue(items)
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', orderNumber: 1, userId: 'u1', status: 'PENDING',
      totalAmount: 22, shippingCost: 12, trackingNumber: null,
      shippingAddress: address, createdAt: '2026-05-31T00:00:00.000Z', paymentClaimed: false, isGuestAccount: false, items: [],
    })
    const createOrder = makeCreateOrder(repo, noActiveSale, authRepo, emailService)
    await createOrder('u1', address)
    // shipping = 12 (total пересчитывается в репозитории внутри транзакции)
    expect(repo.createOrderFromCart).toHaveBeenCalledWith('u1', items, 12, address, null)
  })

  it('отправляет письмо-подтверждение покупателю', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: true, quantity: 1, message: null, categoryId: 'cat1' },
    ])
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', orderNumber: 5, userId: 'u1', status: 'PENDING',
      totalAmount: 22, shippingCost: 12, trackingNumber: null,
      shippingAddress: address, createdAt: '2026-05-31T00:00:00.000Z', paymentClaimed: false, isGuestAccount: false,
      items: [{ id: 'i1', productId: 'p1', productSlug: 's', productName: 'Doll', productImage: null, quantity: 1, price: 10, originalPrice: null, subtotal: 10, message: null }],
    })
    const createOrder = makeCreateOrder(repo, noActiveSale, authRepo, emailService)
    await createOrder('u1', address)
    expect(emailService.sendOrderConfirmation).toHaveBeenCalledWith(
      'natasha@example.com', 'Natasha', 5, [{ id: 'i1', productId: 'p1', productSlug: 's', productName: 'Doll', productImage: null, quantity: 1, price: 10, originalPrice: null, subtotal: 10, message: null }], 22,
    )
  })

  it('ADMIN_EMAIL задан → отправляет алерт админу', async () => {
    process.env.ADMIN_EMAIL = 'admin@natsdoll.com'
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: true, quantity: 1, message: null, categoryId: 'cat1' },
    ])
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', orderNumber: 5, userId: 'u1', status: 'PENDING',
      totalAmount: 22, shippingCost: 12, trackingNumber: null,
      shippingAddress: address, createdAt: '2026-05-31T00:00:00.000Z', paymentClaimed: false, isGuestAccount: false, items: [],
    })
    const createOrder = makeCreateOrder(repo, noActiveSale, authRepo, emailService)
    await createOrder('u1', address)
    expect(emailService.sendNewOrderAlert).toHaveBeenCalledWith('admin@natsdoll.com', 5, 'natasha@example.com', 22)
  })

  it('ADMIN_EMAIL не задан → алерт админу не отправляется', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: true, quantity: 1, message: null, categoryId: 'cat1' },
    ])
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', orderNumber: 5, userId: 'u1', status: 'PENDING',
      totalAmount: 22, shippingCost: 12, trackingNumber: null,
      shippingAddress: address, createdAt: '2026-05-31T00:00:00.000Z', paymentClaimed: false, isGuestAccount: false, items: [],
    })
    const createOrder = makeCreateOrder(repo, noActiveSale, authRepo, emailService)
    await createOrder('u1', address)
    expect(emailService.sendNewOrderAlert).not.toHaveBeenCalled()
  })

  it('сбой отправки писем не ломает создание заказа', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: true, quantity: 1, message: null, categoryId: 'cat1' },
    ])
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', orderNumber: 5, userId: 'u1', status: 'PENDING',
      totalAmount: 22, shippingCost: 12, trackingNumber: null,
      shippingAddress: address, createdAt: '2026-05-31T00:00:00.000Z', paymentClaimed: false, isGuestAccount: false, items: [],
    })
    vi.mocked(emailService.sendOrderConfirmation).mockRejectedValue(new Error('resend down'))
    const createOrder = makeCreateOrder(repo, noActiveSale, authRepo, emailService)
    await expect(createOrder('u1', address)).resolves.toMatchObject({ id: 'order-1' })
  })
})
