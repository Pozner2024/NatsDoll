import { FRONTEND_URL } from '../../../shared/lib'
import type { EmailService } from '../../auth/infrastructure/emailService'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'
import { confirmToken } from './confirm'
import { normalizeEmail } from './normalizeEmail'

function confirmUrl(email: string): string {
  return `${FRONTEND_URL}/newsletter/confirm?email=${encodeURIComponent(email)}&token=${confirmToken(email)}`
}

export function makeSubscribe(repo: NewsletterRepository, emailService: Pick<EmailService, 'sendNewsletterConfirmation'>) {
  return async function subscribe(email: string): Promise<void> {
    const normalized = normalizeEmail(email)
    const subscriber = await repo.upsertSubscriber(normalized)
    if (subscriber.confirmedAt) return
    try {
      await emailService.sendNewsletterConfirmation(normalized, confirmUrl(normalized))
    } catch (err) {
      console.error('Failed to send newsletter confirmation:', err)
    }
  }
}
