import type { PrismaClient } from '@prisma/client'

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

export function makeNewsletterRepository(prisma: PrismaClient): NewsletterRepository {
  return {
    async upsertSubscriber(email) {
      await prisma.newsletterSubscriber.upsert({
        where: { email },
        update: {},
        create: { email },
      })
    },

    getAll: () => prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
    }),

    async deleteById(id) {
      await prisma.newsletterSubscriber.delete({ where: { id } })
    },
  }
}
