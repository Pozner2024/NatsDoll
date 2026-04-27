// **Единственное место в модуле Auth, работающее с БД.** Инкапсулирует сложные запросы к Prisma (создание
// пользователей, ротация токенов) и защищает от них бизнес-логику. Гарантирует атомарность важных операций для
// безопасности сессий

import { type PrismaClient, type User, type RefreshToken, type EmailVerification } from '@prisma/client'

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
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),

    findById: (id) => prisma.user.findUnique({ where: { id } }),

    createUser: (data) => prisma.user.create({ data }),

    createUserWithVerification({ name, email, passwordHash, verification }) {
      return prisma.$transaction(async (tx) => {
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
    },

    async deleteUser(id) {
      await prisma.user.delete({ where: { id } })
    },

    findByGoogleId: (googleId) => prisma.user.findUnique({ where: { googleId } }),

    linkGoogleId: (userId, googleId) =>
      prisma.user.update({ where: { id: userId }, data: { googleId } }),

    createGoogleUser: (data) =>
      prisma.user.create({ data: { ...data, emailVerified: true } }),

    async saveRefreshToken(data) {
      await prisma.refreshToken.create({ data })
    },

    pruneUserSessions(userId, maxActive) {
      return prisma.$transaction(async (tx) => {
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
    },

    findTokenByHash: (tokenHash) => prisma.refreshToken.findUnique({ where: { tokenHash } }),

    async deleteToken(id) {
      await prisma.refreshToken.delete({ where: { id } })
    },

    async revokeToken(id) {
      await prisma.refreshToken.update({
        where: { id },
        data: { revokedAt: new Date() },
      })
    },

    async deleteAllUserTokens(userId) {
      await prisma.refreshToken.deleteMany({ where: { userId } })
    },

    rotateToken(oldId, newData) {
      return prisma.$transaction(async (tx) => {
        const { count } = await tx.refreshToken.updateMany({
          where: { id: oldId, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        if (count === 0) return false
        await tx.refreshToken.create({ data: newData })
        return true
      })
    },

    async createEmailVerification(data) {
      await prisma.emailVerification.create({ data })
    },

    findEmailVerification: (tokenHash) =>
      prisma.emailVerification.findUnique({ where: { tokenHash } }),

    async deleteEmailVerification(id) {
      await prisma.emailVerification.delete({ where: { id } })
    },

    async finalizeEmailVerification(userId, verificationId) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { emailVerified: true } }),
        prisma.emailVerification.delete({ where: { id: verificationId } }),
      ])
    },
  }
}
