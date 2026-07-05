import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRegister } from './register'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { EmailService } from '../infrastructure/emailService'

const GENERIC = 'Check your email to verify your account'

function makeEmail(): EmailService {
  return {
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendAccountExistsEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    sendMessageNotification: vi.fn().mockResolvedValue(undefined),
    sendTrackingNotification: vi.fn().mockResolvedValue(undefined),
    sendContactNotification: vi.fn().mockResolvedValue(undefined),
    sendPaymentCaptureAlert: vi.fn().mockResolvedValue(undefined),
    sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
    sendNewOrderAlert: vi.fn().mockResolvedValue(undefined),
  }
}

function makeRepo(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn(),
    createUser: vi.fn(),
    createUserWithVerification: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }),
    deleteUser: vi.fn(),
    updateUser: vi.fn(),
    findByGoogleId: vi.fn(),
    linkGoogleId: vi.fn(),
    createGoogleUser: vi.fn(),
    replaceUnverifiedWithGoogleUser: vi.fn(),
    saveRefreshToken: vi.fn(),
    pruneUserSessions: vi.fn(),
    findTokenByHash: vi.fn(),
    deleteToken: vi.fn(),
    revokeToken: vi.fn(),
    deleteAllUserTokens: vi.fn(),
    rotateToken: vi.fn(),
    createEmailVerification: vi.fn(),
    findEmailVerification: vi.fn(),
    deleteEmailVerification: vi.fn(),
    finalizeEmailVerification: vi.fn(),
    replaceEmailVerification: vi.fn().mockResolvedValue(undefined),
    resetUnverifiedRegistration: vi.fn().mockResolvedValue(undefined),
    createPasswordReset: vi.fn(),
    findPasswordReset: vi.fn(),
    deletePasswordReset: vi.fn(),
    finalizePasswordReset: vi.fn(),
    ...overrides,
  } as AuthRepository
}

const data = { name: 'A', email: 'a@b.com', password: 'secret' }

describe('register', () => {
  let email: EmailService
  beforeEach(() => { email = makeEmail() })

  it('free email → creates user + verification email, generic response', async () => {
    const repo = makeRepo()
    const register = makeRegister(repo, email)
    const res = await register(data)
    expect(res.message).toBe(GENERIC)
    expect(repo.createUserWithVerification).toHaveBeenCalled()
    expect(email.sendVerificationEmail).toHaveBeenCalled()
    expect(email.sendAccountExistsEmail).not.toHaveBeenCalled()
  })

  it('taken + verified → account-exists email, no user created, generic response', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn().mockResolvedValue({ id: 'u9', email: 'a@b.com', emailVerified: true, passwordHash: 'h' }),
    })
    const register = makeRegister(repo, email)
    const res = await register(data)
    expect(res.message).toBe(GENERIC)
    expect(email.sendAccountExistsEmail).toHaveBeenCalled()
    expect(repo.createUserWithVerification).not.toHaveBeenCalled()
    expect(repo.replaceEmailVerification).not.toHaveBeenCalled()
  })

  it('taken + unverified → overwrites name+password and resends verification (anti pre-hijack)', async () => {
    const repo = makeRepo({
      findByEmail: vi.fn().mockResolvedValue({ id: 'u9', email: 'a@b.com', emailVerified: false, passwordHash: 'attacker-hash' }),
    })
    const register = makeRegister(repo, email)
    const res = await register(data)
    expect(res.message).toBe(GENERIC)
    // Пароль последнего регистранта перезаписывает прежний неверифицированный —
    // иначе verify подтвердил бы аккаунт с паролем того, кто НЕ владеет почтой.
    expect(repo.resetUnverifiedRegistration).toHaveBeenCalledTimes(1)
    const call = (repo.resetUnverifiedRegistration as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toBe('u9')
    expect(call[1].name).toBe('A')
    expect(typeof call[1].passwordHash).toBe('string')
    expect(call[1].passwordHash).not.toBe('attacker-hash')
    expect(call[1].verification.tokenHash).toEqual(expect.any(String))
    expect(email.sendVerificationEmail).toHaveBeenCalled()
    expect(repo.createUserWithVerification).not.toHaveBeenCalled()
  })
})
