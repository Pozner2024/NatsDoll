import { type PrismaClient } from '@prisma/client'

export type ContactRepository = {
  create(data: { name: string; email: string; message: string }): Promise<void>
}

export function makeContactRepository(prisma: PrismaClient): ContactRepository {
  return {
    async create(data) {
      await prisma.contactMessage.create({ data })
    },
  }
}
