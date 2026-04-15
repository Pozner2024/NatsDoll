import { Prisma, type PrismaClient } from '@prisma/client'
import { NotFoundError } from '../../../shared/errors'

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

function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') throw new NotFoundError('Subscriber not found')
    console.error('Prisma known error:', { code: err.code, meta: err.meta, message: err.message })
    throw new Error('Database error', { cause: err })
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error('Prisma unknown error:', err.message)
    throw new Error('Database error', { cause: err })
  }
  throw err
}

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
        handlePrismaError(err)
      }
    },
  }
}
