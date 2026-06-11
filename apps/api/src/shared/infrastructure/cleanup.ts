import type { PrismaClient } from '@prisma/client'
import { REFRESH_TOKEN_TTL_MS } from '../lib'

export async function cleanupExpiredAuthRecords(prisma: PrismaClient): Promise<void> {
  const now = new Date()
  const revokedBefore = new Date(now.getTime() - REFRESH_TOKEN_TTL_MS)
  try {
    const [tokens, verifications, passwordResets] = await Promise.all([
      prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: now } },
            { revokedAt: { lt: revokedBefore } },
          ],
        },
      }),
      prisma.emailVerification.deleteMany({ where: { expiresAt: { lt: now } } }),
      prisma.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } }),
    ])
    if (tokens.count || verifications.count || passwordResets.count) {
      console.log(`[cleanup] expired refreshTokens=${tokens.count} emailVerifications=${verifications.count} passwordResets=${passwordResets.count}`)
    }
  } catch (err) {
    console.error('[cleanup] failed:', err)
  }
}
