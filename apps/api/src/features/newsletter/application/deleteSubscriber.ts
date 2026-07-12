import type { NewsletterRepository } from '../infrastructure/newsletterRepository'

export function makeDeleteSubscriber(repo: NewsletterRepository) {
  return async function deleteSubscriber(id: string): Promise<void> {
    await repo.deleteById(id)
  }
}
