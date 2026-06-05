import type { AdminRepository, UpdateAdminOrder, UpdateOrderInput } from '../types'
import type { EmailService } from '../../auth/infrastructure/emailService'

export function makeUpdateAdminOrder(repo: AdminRepository, emailService: EmailService): UpdateAdminOrder {
  return async (orderId: string, input: UpdateOrderInput): Promise<void> => {
    const result = await repo.updateAdminOrder(orderId, input)
    if (result) {
      try {
        await emailService.sendTrackingNotification(
          result.userEmail,
          result.userName,
          result.orderNumber,
          result.trackingNumber,
        )
      } catch (err) {
        console.error('Failed to send tracking notification:', err)
      }
    }
  }
}
