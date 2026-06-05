import { AppError } from '../../../shared/errors'
import type { MessageRepository, CreateMessageData } from '../types'
import type { EmailService } from '../../auth/infrastructure/emailService'

export function makeCreateMessage(repo: MessageRepository, emailService: EmailService) {
  return async function createMessage(userId: string, data: CreateMessageData): Promise<void> {
    if (!data.text.trim()) throw new AppError(400, 'Message text is required')

    const { message, userName, userEmail } = await repo.create(userId, data)

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      try {
        await emailService.sendMessageNotification(
          adminEmail, userName, userEmail, message.text, message.orderNumber ?? undefined,
        )
      } catch (err) {
        console.error('Failed to send message notification:', err)
      }
    }
  }
}
