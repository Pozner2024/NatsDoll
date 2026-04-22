import type { PrismaClient } from '@prisma/client'
import { handlePrismaError } from '../../../shared/infrastructure'

export type NewsletterSubscriber = {
  id: string
  email: string
  subscribedAt: Date
}

export type NewsletterRepository = {
  upsertSubscriber(email: string): Promise<void>
  getAll(): Promise<NewsletterSubscriber[]>
  deleteById(id: string): Promise<void>
}

const NOT_FOUND_MESSAGE = 'Subscriber not found'

export function makeNewsletterRepository(prisma: PrismaClient): NewsletterRepository {
  return {
    async upsertSubscriber(email: string): Promise<void> {
      try {
        await prisma.newsletterSubscriber.upsert({
          where: { email },
          update: {},
          create: { email },
        })
      } catch (err) {
        handlePrismaError(err)
      }
    },

    async getAll(): Promise<NewsletterSubscriber[]> {
      try {
        return await prisma.newsletterSubscriber.findMany({
          orderBy: { subscribedAt: 'desc' },
        })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async deleteById(id: string): Promise<void> {
      try {
        await prisma.newsletterSubscriber.delete({ where: { id } })
      } catch (err) {
        handlePrismaError(err, { notFoundMessage: NOT_FOUND_MESSAGE })
      }
    },
  }
}
