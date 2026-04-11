import { z } from 'zod'
import { ValidationError } from '../../../shared/errors'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'

const emailSchema = z.string().email()

export function makeSubscribe(repo: NewsletterRepository) {
  return async function subscribe(email: string): Promise<void> {
    const result = emailSchema.safeParse(email)
    if (!result.success) throw new ValidationError('Invalid email')
    await repo.upsertSubscriber(result.data)
  }
}
