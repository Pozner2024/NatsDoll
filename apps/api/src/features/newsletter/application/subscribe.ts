import type { NewsletterRepository } from '../infrastructure/newsletterRepository'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function makeSubscribe(repo: NewsletterRepository) {
  return async function subscribe(email: string): Promise<void> {
    await repo.upsertSubscriber(normalizeEmail(email))
  }
}
