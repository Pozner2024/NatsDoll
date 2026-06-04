import { describe, it, expect, vi } from 'vitest'
import { makeResetPassword } from './resetPassword'
import type { AuthRepository } from '../infrastructure/authRepository'

vi.mock('@node-rs/argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed'),
}))

vi.mock('../../../shared/lib/tokens', () => ({
  hashToken: vi.fn().mockReturnValue('token_hash'),
}))

vi.mock('./issueTokens', () => ({
  issueTokensForUser: vi.fn().mockResolvedValue({
    accessToken: 'a', refreshToken: 'r', user: { id: 'u1', name: 'A', email: 'a@b.com', role: 'CUSTOMER' },
  }),
}))

function makeRepo(over: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findByEmail: vi.fn(), findById: vi.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'A' }),
    createUser: vi.fn(), createUserWithVerification: vi.fn(), deleteUser: vi.fn(), updateUser: vi.fn(),
    findByGoogleId: vi.fn(), linkGoogleId: vi.fn(), createGoogleUser: vi.fn(),
    replaceUnverifiedWithGoogleUser: vi.fn(), saveRefreshToken: vi.fn(), pruneUserSessions: vi.fn(),
    findTokenByHash: vi.fn(), deleteToken: vi.fn(), revokeToken: vi.fn(), deleteAllUserTokens: vi.fn(),
    rotateToken: vi.fn(), createEmailVerification: vi.fn(), findEmailVerification: vi.fn(),
    deleteEmailVerification: vi.fn(), finalizeEmailVerification: vi.fn(), replaceEmailVerification: vi.fn(),
    createPasswordReset: vi.fn(),
    findPasswordReset: vi.fn().mockResolvedValue({ id: 'r1', userId: 'u1', expiresAt: new Date(Date.now() + 60000) }),
    deletePasswordReset: vi.fn().mockResolvedValue(undefined),
    finalizePasswordReset: vi.fn().mockResolvedValue(undefined),
    ...over,
  } as AuthRepository
}

describe('resetPassword', () => {
  it('valid token → finalizes + issues tokens', async () => {
    const repo = makeRepo()
    const fn = makeResetPassword(repo)
    const res = await fn('rawtoken', 'newpass')
    expect(repo.finalizePasswordReset).toHaveBeenCalledWith('u1', 'r1', expect.any(String))
    expect(res.accessToken).toBe('a')
  })

  it('missing token → 400', async () => {
    const repo = makeRepo({ findPasswordReset: vi.fn().mockResolvedValue(null) })
    const fn = makeResetPassword(repo)
    await expect(fn('bad', 'newpass')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('expired token → 400 and row deleted', async () => {
    const repo = makeRepo({
      findPasswordReset: vi.fn().mockResolvedValue({ id: 'r1', userId: 'u1', expiresAt: new Date(Date.now() - 1000) }),
    })
    const fn = makeResetPassword(repo)
    await expect(fn('rawtoken', 'newpass')).rejects.toMatchObject({ statusCode: 400 })
    expect(repo.deletePasswordReset).toHaveBeenCalledWith('r1')
  })
})
