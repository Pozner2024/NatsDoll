import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeUpdateAdminOrder } from './updateAdminOrder'

const repo = {
  updateAdminOrder: vi.fn(),
}

const emailService = {
  sendTrackingNotification: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('updateAdminOrder', () => {
  it('шлёт уведомление о трекинге, когда репозиторий вернул данные заказа', async () => {
    repo.updateAdminOrder.mockResolvedValue({
      userEmail: 'a@b.com',
      userName: 'Alice',
      orderNumber: 42,
      trackingNumber: 'TRK1',
    })

    const updateAdminOrder = makeUpdateAdminOrder(repo as any, emailService as any)
    await updateAdminOrder('o1', { status: 'SHIPPED', trackingNumber: 'TRK1' })

    expect(repo.updateAdminOrder).toHaveBeenCalledWith('o1', { status: 'SHIPPED', trackingNumber: 'TRK1' })
    expect(emailService.sendTrackingNotification).toHaveBeenCalledWith('a@b.com', 'Alice', 42, 'TRK1')
  })

  it('не шлёт уведомление, когда репозиторий вернул null', async () => {
    repo.updateAdminOrder.mockResolvedValue(null)

    const updateAdminOrder = makeUpdateAdminOrder(repo as any, emailService as any)
    await updateAdminOrder('o1', { status: 'PROCESSING' })

    expect(emailService.sendTrackingNotification).not.toHaveBeenCalled()
  })

  it('проглатывает ошибку отправки письма и не пробрасывает её наружу', async () => {
    repo.updateAdminOrder.mockResolvedValue({
      userEmail: 'a@b.com',
      userName: 'Alice',
      orderNumber: 42,
      trackingNumber: 'TRK1',
    })
    emailService.sendTrackingNotification.mockRejectedValue(new Error('SMTP down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const updateAdminOrder = makeUpdateAdminOrder(repo as any, emailService as any)

    await expect(
      updateAdminOrder('o1', { status: 'SHIPPED', trackingNumber: 'TRK1' }),
    ).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
