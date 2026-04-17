import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeGetMe } from './getMe'
import type { AuthRepository } from '../infrastructure/authRepository'
import type { User } from '@prisma/client'

const mockUser: User = {
  id: 'user1',
  name: 'Natasha',
  email: 'nat@test.com',
  passwordHash: 'hash',
  googleId: null,
  role: 'CUSTOMER',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockRepo: AuthRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  createUser: vi.fn(),
  saveRefreshToken: vi.fn(),
  findTokenByHash: vi.fn(),
  deleteToken: vi.fn(),
  revokeAllUserTokens: vi.fn(),
  findByGoogleId: vi.fn().mockResolvedValue(null),
  linkGoogleId: vi.fn().mockResolvedValue(null),
  createGoogleUser: vi.fn().mockResolvedValue(null),
  revokeToken: vi.fn().mockResolvedValue(undefined),
}

describe('getMe', () => {
  beforeEach(() => vi.clearAllMocks())

  it('возвращает данные пользователя', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(mockUser)
    const getMe = makeGetMe(mockRepo)
    const result = await getMe('user1')
    expect(result).toEqual({ id: 'user1', name: 'Natasha', email: 'nat@test.com', role: 'CUSTOMER' })
  })

  it('возвращает null если пользователь не найден', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null)
    const getMe = makeGetMe(mockRepo)
    const result = await getMe('nonexistent')
    expect(result).toBeNull()
  })
})
