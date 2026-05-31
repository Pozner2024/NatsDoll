import type { PrismaClient } from '@prisma/client'
import { AppError } from '../../../shared/errors'
import type { AddressRepository, AddressView } from '../types'

function toView(a: { id: string; fullName: string; line1: string; line2: string | null; city: string; country: string; postalCode: string; isDefault: boolean; createdAt: Date }): AddressView {
  return {
    id: a.id,
    fullName: a.fullName,
    line1: a.line1,
    line2: a.line2 ?? undefined,
    city: a.city,
    country: a.country,
    postalCode: a.postalCode,
    isDefault: a.isDefault,
    createdAt: a.createdAt.toISOString(),
  }
}

export function makeAddressRepository(prisma: PrismaClient): AddressRepository {
  return {
    async findByUser(userId) {
      const rows = await prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      })
      return rows.map(toView)
    },

    async create(userId, data) {
      const row = await prisma.$transaction(async (tx) => {
        const count = await tx.address.count({ where: { userId } })
        return tx.address.create({
          data: { userId, ...data, isDefault: count === 0 },
        })
      })
      return toView(row)
    },

    async update(id, userId, data) {
      const existing = await prisma.address.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) throw new AppError(404, 'Address not found')
      const row = await prisma.address.update({ where: { id }, data })
      return toView(row)
    },

    async delete(id, userId) {
      const existing = await prisma.address.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) throw new AppError(404, 'Address not found')
      await prisma.$transaction(async (tx) => {
        await tx.address.delete({ where: { id } })
        if (existing.isDefault) {
          const next = await tx.address.findFirst({
            where: { userId },
            orderBy: { createdAt: 'asc' },
          })
          if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } })
        }
      })
    },

    async setDefault(id, userId) {
      const existing = await prisma.address.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) throw new AppError(404, 'Address not found')
      await prisma.$transaction([
        prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
        prisma.address.update({ where: { id }, data: { isDefault: true } }),
      ])
    },

    countByUser: (userId) => prisma.address.count({ where: { userId } }),
  }
}
