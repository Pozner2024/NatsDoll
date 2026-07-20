import type { PrismaClient } from '@prisma/client'

export type NewsletterSubscriber = {
  id: string
  email: string
  subscribedAt: Date
  confirmedAt: Date | null
}

export type NewsletterRepository = {
  upsertSubscriber(email: string): Promise<NewsletterSubscriber>
  getAll(): Promise<NewsletterSubscriber[]>
  deleteById(id: string): Promise<void>
  deleteByEmail(email: string): Promise<void>
  confirmByEmail(email: string): Promise<void>
}

export function makeNewsletterRepository(prisma: PrismaClient): NewsletterRepository {
  return {
    upsertSubscriber: (email) => prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    }),

    getAll: () => prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
    }),

    async deleteById(id) {
      await prisma.newsletterSubscriber.deleteMany({ where: { id } })
    },

    async deleteByEmail(email) {
      await prisma.newsletterSubscriber.deleteMany({ where: { email } })
    },

    async confirmByEmail(email) {
      await prisma.newsletterSubscriber.updateMany({ where: { email }, data: { confirmedAt: new Date() } })
    },
  }
}
