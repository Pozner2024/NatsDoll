import type { AdminRepository, UpdateAdminOrder, UpdateOrderInput } from '../types'
import type { EmailService } from '../../auth/infrastructure/emailService'

export function makeUpdateAdminOrder(repo: AdminRepository, emailService: EmailService): UpdateAdminOrder {
  return async (orderId: string, input: UpdateOrderInput): Promise<void> => {
    const result = await repo.updateAdminOrder(orderId, input)
    if (result) {
      await emailService.sendTrackingNotification(
        result.userEmail,
        result.userName,
        result.orderNumber,
        result.trackingNumber,
      )
    }
  }
}
