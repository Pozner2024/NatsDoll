import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequestPasswordReset } from './requestPasswordReset'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { EmailService } from '../infrastructure/emailService'

vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed'),
}))

vi.mock('../../../shared/lib/tokens', () => ({
  generateRefreshToken: vi.fn().mockReturnValue('raw_token'),
  hashToken: vi.fn().mockReturnValue('token_hash'),
  PASSWORD_RESET_TTL_MS: 3600000,
}))

const GENERIC = 'If an account exists, a reset link has been sent'

function makeEmail(): EmailService {
  return {
    sendVerificationEmail: vi.fn(),
    sendAccountExistsEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendMessageNotification: vi.fn(),
    sendTrackingNotification: vi.fn(),
  } as unknown as EmailService
}

function makeRepo(over: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    createPasswordReset: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(), createUser: vi.fn(), createUserWithVerification: vi.fn(),
    deleteUser: vi.fn(), updateUser: vi.fn(), findByGoogleId: vi.fn(), linkGoogleId: vi.fn(),
    createGoogleUser: vi.fn(), replaceUnverifiedWithGoogleUser: vi.fn(), saveRefreshToken: vi.fn(),
    pruneUserSessions: vi.fn(), findTokenByHash: vi.fn(), deleteToken: vi.fn(), revokeToken: vi.fn(),
    deleteAllUserTokens: vi.fn(), rotateToken: vi.fn(), createEmailVerification: vi.fn(),
    findEmailVerification: vi.fn(), deleteEmailVerification: vi.fn(), finalizeEmailVerification: vi.fn(),
    replaceEmailVerification: vi.fn(), findPasswordReset: vi.fn(), deletePasswordReset: vi.fn(),
    finalizePasswordReset: vi.fn(),
    ...over,
  } as AuthRepository
}

describe('requestPasswordReset', () => {
  let email: EmailService
  beforeEach(() => { email = makeEmail() })

  it('user with password → creates reset + sends reset email', async () => {
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash: 'h' }) })
    const fn = makeRequestPasswordReset(repo, email)
    const res = await fn('a@b.com')
    expect(res.message).toBe(GENERIC)
    expect(repo.createPasswordReset).toHaveBeenCalled()
    expect(email.sendPasswordResetEmail).toHaveBeenCalled()
  })

  it('google-only user → sends account-exists email, no reset row', async () => {
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash: null, googleId: 'g1' }) })
    const fn = makeRequestPasswordReset(repo, email)
    const res = await fn('a@b.com')
    expect(res.message).toBe(GENERIC)
    expect(repo.createPasswordReset).not.toHaveBeenCalled()
    expect(email.sendAccountExistsEmail).toHaveBeenCalled()
  })

  it('sends a reset link to a passwordless guest (no googleId) so they can set a first password', async () => {
    const guest = { id: 'g1', email: 'a@b.com', passwordHash: null, googleId: null }
    const repo = { findByEmail: vi.fn().mockResolvedValue(guest), createPasswordReset: vi.fn().mockResolvedValue(undefined) }
    const em = { sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined), sendAccountExistsEmail: vi.fn() }
    const uc = makeRequestPasswordReset(repo as never, em as never)
    await uc('a@b.com')
    expect(repo.createPasswordReset).toHaveBeenCalled()
    expect(em.sendPasswordResetEmail).toHaveBeenCalled()
    expect(em.sendAccountExistsEmail).not.toHaveBeenCalled()
  })

  it('no user → no email, generic response', async () => {
    const repo = makeRepo()
    const fn = makeRequestPasswordReset(repo, email)
    const res = await fn('x@y.com')
    expect(res.message).toBe(GENERIC)
    expect(repo.createPasswordReset).not.toHaveBeenCalled()
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled()
  })
})
