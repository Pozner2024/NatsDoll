import { timingSafeEqual } from 'node:crypto'
import { AppError } from '../../../shared/errors'
import { hashToken } from '../../../shared/lib'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'
import { normalizeEmail } from './subscribe'

const TOKEN_PREFIX = 'newsletter-unsubscribe:'

export function unsubscribeToken(email: string): string {
  return hashToken(TOKEN_PREFIX + normalizeEmail(email))
}

export function makeUnsubscribe(repo: NewsletterRepository) {
  return async function unsubscribe(email: string, token: string): Promise<void> {
    const expected = Buffer.from(unsubscribeToken(email))
    const provided = Buffer.from(token)
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new AppError(400, 'Invalid unsubscribe link')
    }
    await repo.deleteByEmail(normalizeEmail(email))
  }
}
