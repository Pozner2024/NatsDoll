import { Prisma, type PrismaClient } from '@prisma/client'

export type ContactRepository = {
  create(data: { name: string; email: string; message: string }): Promise<void>
}

function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('Prisma known error:', { code: err.code, meta: err.meta })
    throw new Error('Database error')
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error('Prisma unknown error:', err.message)
    throw new Error('Database error')
  }
  throw err
}

export function makeContactRepository(prisma: PrismaClient): ContactRepository {
  return {
    async create(data) {
      try {
        await prisma.contactMessage.create({ data })
      } catch (err) {
        handlePrismaError(err)
      }
    },
  }
}
