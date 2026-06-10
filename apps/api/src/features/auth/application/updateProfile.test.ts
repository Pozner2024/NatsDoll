import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeUpdateProfile } from './updateProfile'
import { AppError } from '../../../shared/errors'

vi.mock('@node-rs/argon2', () => ({
  verify: vi.fn(),
  hash: vi.fn(),
}))

const mockUser = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'CUSTOMER' as const,
  passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$abc$def',
  googleId: null,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const repo = {
  findById: vi.fn(),
  updateUser: vi.fn(),
  updateUserAndInvalidateSessions: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('updateProfile', () => {
  it('updates name only', async () => {
    repo.findById.mockResolvedValue(mockUser)
    repo.updateUser.mockResolvedValue({ ...mockUser, name: 'Bob' })

    const updateProfile = makeUpdateProfile(repo as any)
    const result = await updateProfile('u1', { name: 'Bob' })

    expect(repo.updateUser).toHaveBeenCalledWith('u1', { name: 'Bob' })
    expect(result.name).toBe('Bob')
    expect(repo.updateUserAndInvalidateSessions).not.toHaveBeenCalled()
  })

  it('throws 400 when no fields provided', async () => {
    const updateProfile = makeUpdateProfile(repo as any)
    await expect(updateProfile('u1', {})).rejects.toThrow(AppError)
  })

  it('throws 400 when password provided without currentPassword', async () => {
    repo.findById.mockResolvedValue(mockUser)
    const updateProfile = makeUpdateProfile(repo as any)
    await expect(updateProfile('u1', { password: 'newpass' })).rejects.toThrow(AppError)
  })

  it('throws 401 when currentPassword is wrong', async () => {
    repo.findById.mockResolvedValue(mockUser)
    const updateProfile = makeUpdateProfile(repo as any)
    await expect(
      updateProfile('u1', { password: 'newpass', currentPassword: 'wrongpass' }),
    ).rejects.toThrow(AppError)
  })

  it('инвалидирует все сессии при успешной смене пароля', async () => {
    const { verify, hash } = await import('@node-rs/argon2')
    vi.mocked(verify).mockResolvedValue(true)
    vi.mocked(hash).mockResolvedValue('$argon2id$v=19$new-hash')
    repo.findById.mockResolvedValue(mockUser)
    repo.updateUserAndInvalidateSessions.mockResolvedValue(mockUser)

    const updateProfile = makeUpdateProfile(repo as any)
    await updateProfile('u1', { password: 'newpassword', currentPassword: 'oldpassword' })

    expect(repo.updateUserAndInvalidateSessions).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ passwordHash: '$argon2id$v=19$new-hash' }),
    )
    expect(repo.updateUser).not.toHaveBeenCalled()
  })
})
