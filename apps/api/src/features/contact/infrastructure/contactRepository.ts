// **Сохранение**: Данные записываются в таблицу `ContactMessage`, где ID создается автоматически.

import { type PrismaClient } from '@prisma/client'
import { handlePrismaError } from '../../../shared/infrastructure'

export type ContactRepository = {
  create(data: { name: string; email: string; message: string }): Promise<void>
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
