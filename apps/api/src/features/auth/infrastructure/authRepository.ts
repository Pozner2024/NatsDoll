import { Prisma, type PrismaClient, type User, type RefreshToken } from '@prisma/client'

export type AuthRepository = {
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  createUser(data: { name: string; email: string; passwordHash: string }): Promise<User>
  saveRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>
  findTokenByHash(tokenHash: string): Promise<RefreshToken | null>
  deleteToken(id: string): Promise<void>
  revokeAllUserTokens(userId: string): Promise<void>
}

function handlePrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('Prisma known error:', { code: err.code, meta: err.meta })
    throw new Error('Database error', { cause: err })
  }
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error('Prisma unknown error:', err.message)
    throw new Error('Database error', { cause: err })
  }
  throw err
}

export function makeAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    async findByEmail(email) {
      try {
        return await prisma.user.findUnique({ where: { email } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async findById(id) {
      try {
        return await prisma.user.findUnique({ where: { id } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async createUser(data) {
      try {
        return await prisma.user.create({ data })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async saveRefreshToken(data) {
      try {
        await prisma.refreshToken.create({ data })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async findTokenByHash(tokenHash) {
      try {
        return await prisma.refreshToken.findUnique({ where: { tokenHash } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async deleteToken(id) {
      try {
        await prisma.refreshToken.delete({ where: { id } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async revokeAllUserTokens(userId) {
      try {
        await prisma.refreshToken.deleteMany({ where: { userId } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },
  }
}
