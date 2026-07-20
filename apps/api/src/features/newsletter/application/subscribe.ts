import type { NewsletterRepository } from '../infrastructure/newsletterRepository'
import { normalizeEmail } from './normalizeEmail'

export function makeSubscribe(repo: NewsletterRepository) {
  return async function subscribe(email: string): Promise<void> {
    await repo.upsertSubscriber(normalizeEmail(email))
  }
}
