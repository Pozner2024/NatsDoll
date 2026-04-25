// **Единственное место в модуле Auth, работающее с БД.** Инкапсулирует сложные запросы к Prisma (создание
// пользователей, ротация токенов) и защищает от них бизнес-логику. Гарантирует атомарность важных операций для       
// безопасности сессий

import { type PrismaClient, type User, type RefreshToken, type EmailVerification } from '@prisma/client'
import { handlePrismaError } from '../../../shared/infrastructure'

export type AuthRepository = {
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  createUser(data: { name: string; email: string; passwordHash: string }): Promise<User>
  /** Атомарно создаёт user и emailVerification. */
  createUserWithVerification(data: {
    name: string
    email: string
    passwordHash: string
    verification: { tokenHash: string; expiresAt: Date }
  }): Promise<User>
  deleteUser(id: string): Promise<void>
  findByGoogleId(googleId: string): Promise<User | null>
  linkGoogleId(userId: string, googleId: string): Promise<User>
  createGoogleUser(data: { name: string; email: string; googleId: string }): Promise<User>
  saveRefreshToken(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>
  /** Чистит revoked-токены и оставляет только `maxActive` самых свежих активных. */
  pruneUserSessions(userId: string, maxActive: number): Promise<void>
  findTokenByHash(tokenHash: string): Promise<RefreshToken | null>
  deleteToken(id: string): Promise<void>
  revokeToken(id: string): Promise<void>
  /** Полностью удаляет все refresh-токены пользователя — используется при reuse-detection и глобальном logout. */
  deleteAllUserTokens(userId: string): Promise<void>
  /** Атомарно отзывает старый токен и создаёт новый. Возвращает false при повторном использовании. */
  rotateToken(oldId: string, newData: { userId: string; tokenHash: string; expiresAt: Date }): Promise<boolean>
  createEmailVerification(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>
  findEmailVerification(tokenHash: string): Promise<EmailVerification | null>
  deleteEmailVerification(id: string): Promise<void>
  /** Атомарно помечает email верифицированным и удаляет verification-запись. */
  finalizeEmailVerification(userId: string, verificationId: string): Promise<void>
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

    async createUserWithVerification({ name, email, passwordHash, verification }) {
      try {
        return await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({ data: { name, email, passwordHash } })
          await tx.emailVerification.create({
            data: {
              userId: user.id,
              tokenHash: verification.tokenHash,
              expiresAt: verification.expiresAt,
            },
          })
          return user
        })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async deleteUser(id) {
      try {
        await prisma.user.delete({ where: { id } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async findByGoogleId(googleId) {
      try {
        return await prisma.user.findUnique({ where: { googleId } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async linkGoogleId(userId, googleId) {
      try {
        return await prisma.user.update({ where: { id: userId }, data: { googleId } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async createGoogleUser(data) {
      try {
        return await prisma.user.create({ data: { ...data, emailVerified: true } })
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

    async pruneUserSessions(userId, maxActive) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.refreshToken.deleteMany({
            where: { userId, revokedAt: { not: null } },
          })
          const active = await tx.refreshToken.findMany({
            where: { userId, revokedAt: null },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
          })
          const toDelete = active.slice(maxActive).map((t) => t.id)
          if (toDelete.length > 0) {
            await tx.refreshToken.deleteMany({ where: { id: { in: toDelete } } })
          }
        })
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

    async revokeToken(id) {
      try {
        await prisma.refreshToken.update({
          where: { id },
          data: { revokedAt: new Date() },
        })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async deleteAllUserTokens(userId) {
      try {
        await prisma.refreshToken.deleteMany({ where: { userId } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async rotateToken(oldId, newData) {
      try {
        return await prisma.$transaction(async (tx) => {
          const { count } = await tx.refreshToken.updateMany({
            where: { id: oldId, revokedAt: null },
            data: { revokedAt: new Date() },
          })
          if (count === 0) return false
          await tx.refreshToken.create({ data: newData })
          return true
        })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async createEmailVerification(data) {
      try {
        await prisma.emailVerification.create({ data })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async findEmailVerification(tokenHash) {
      try {
        return await prisma.emailVerification.findUnique({ where: { tokenHash } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async deleteEmailVerification(id) {
      try {
        await prisma.emailVerification.delete({ where: { id } })
      } catch (err) {
        return handlePrismaError(err)
      }
    },

    async finalizeEmailVerification(userId, verificationId) {
      try {
        await prisma.$transaction([
          prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
          prisma.emailVerification.delete({ where: { id: verificationId } }),
        ])
      } catch (err) {
        return handlePrismaError(err)
      }
    },
  }
}
