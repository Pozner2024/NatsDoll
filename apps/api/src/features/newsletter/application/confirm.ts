import { timingSafeEqual } from 'node:crypto'
import { AppError } from '../../../shared/errors'
import { hashToken } from '../../../shared/lib'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'
import { normalizeEmail } from './normalizeEmail'

const TOKEN_PREFIX = 'newsletter-confirm:'

export function confirmToken(email: string): string {
  return hashToken(TOKEN_PREFIX + normalizeEmail(email))
}

export function makeConfirm(repo: NewsletterRepository) {
  return async function confirm(email: string, token: string): Promise<void> {
    const expected = Buffer.from(confirmToken(email))
    const provided = Buffer.from(token)
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new AppError(400, 'Invalid confirmation link')
    }
    await repo.confirmByEmail(normalizeEmail(email))
  }
}
