import type { NewsletterRepository } from '../infrastructure/newsletterRepository'

export function makeSubscribe(repo: NewsletterRepository) {
  return async function subscribe(email: string): Promise<void> {
    await repo.upsertSubscriber(email)
  }
}
