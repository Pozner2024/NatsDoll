import { hash } from '@node-rs/argon2'
import { Prisma } from '@prisma/client'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { EmailService } from '../infrastructure/emailService'
import {
  generateRefreshToken,
  hashToken,
  EMAIL_VERIFICATION_TTL_MS,
  FRONTEND_URL,
} from '../../../shared/lib'

type RegisterData = { name: string; email: string; password: string }
type RegisterResult = { message: string }

const GENERIC_MESSAGE = 'Check your email to verify your account'

function verificationUrl(rawToken: string): string {
  return `${FRONTEND_URL}/verify-email?token=${rawToken}`
}

export function makeRegister(repo: AuthRepository, emailService: EmailService) {
  return async function register(data: RegisterData): Promise<RegisterResult> {
    const existing = await repo.findByEmail(data.email)

    if (existing) {
      await hash(data.password).catch(() => undefined)
      try {
        if (existing.emailVerified) {
          await emailService.sendAccountExistsEmail(existing.email, `${FRONTEND_URL}/reset-password`)
        } else {
          const rawToken = generateRefreshToken()
          const tokenHash = hashToken(rawToken)
          const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)
          await repo.replaceEmailVerification(existing.id, { tokenHash, expiresAt })
          await emailService.sendVerificationEmail(existing.email, verificationUrl(rawToken))
        }
      } catch (err) {
        console.error('[register] failed to send email for existing account:', err)
      }
      return { message: GENERIC_MESSAGE }
    }

    const passwordHash = await hash(data.password)
    const rawToken = generateRefreshToken()
    const tokenHash = hashToken(rawToken)
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)

    let user: { id: string; email: string }
    try {
      user = await repo.createUserWithVerification({
        name: data.name,
        email: data.email,
        passwordHash,
        verification: { tokenHash, expiresAt },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { message: GENERIC_MESSAGE }
      }
      throw err
    }

    try {
      await emailService.sendVerificationEmail(user.email, verificationUrl(rawToken))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('Failed to send verification email', { userId: user.id, message })
    }

    return { message: GENERIC_MESSAGE }
  }
}
