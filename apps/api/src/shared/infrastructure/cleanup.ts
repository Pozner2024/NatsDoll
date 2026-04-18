import type { PrismaClient } from '@prisma/client'

export async function cleanupExpiredAuthRecords(prisma: PrismaClient): Promise<void> {
  const now = new Date()
  try {
    const [tokens, verifications] = await Promise.all([
      prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.emailVerification.deleteMany({ where: { expiresAt: { lt: now } } }),
    ])
    if (tokens.count || verifications.count) {
      console.log(`[cleanup] expired refreshTokens=${tokens.count} emailVerifications=${verifications.count}`)
    }
  } catch (err) {
    console.error('[cleanup] failed:', err)
  }
}
