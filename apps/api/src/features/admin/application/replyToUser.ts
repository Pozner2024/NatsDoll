import type { AdminRepository, ReplyToUser, ReplyInput } from '../types'
import type { EmailService } from '../../auth/infrastructure/emailService'

export function makeReplyToUser(repo: AdminRepository, emailService: EmailService): ReplyToUser {
  return async (input: ReplyInput): Promise<void> => {
    const { userEmail, userName } = await repo.replyToUser(input)
    try {
      await emailService.sendReplyNotification(userEmail, userName, input.text)
    } catch (err) {
      console.error('Failed to send reply notification:', err)
    }
  }
}
