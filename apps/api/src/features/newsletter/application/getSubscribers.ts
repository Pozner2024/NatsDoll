import type { NewsletterRepository, NewsletterSubscriber } from '../infrastructure/newsletterRepository'

export function makeGetSubscribers(repo: NewsletterRepository) {
  return async function getSubscribers(): Promise<NewsletterSubscriber[]> {
    return repo.getAll()
  }
}
