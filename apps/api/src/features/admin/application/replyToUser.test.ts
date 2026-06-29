import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeReplyToUser } from './replyToUser'

const repo = { replyToUser: vi.fn() }

beforeEach(() => vi.clearAllMocks())

describe('replyToUser', () => {
  it('делегирует input в repo.replyToUser', async () => {
    repo.replyToUser.mockResolvedValue(undefined)
    const replyToUser = makeReplyToUser(repo as any)

    const input = { userId: 'u1', text: 'Привет!', orderId: 'o1' }
    await replyToUser(input)

    expect(repo.replyToUser).toHaveBeenCalledWith(input)
  })

  it('пробрасывает ошибку репозитория наверх', async () => {
    repo.replyToUser.mockRejectedValue(new Error('db down'))
    const replyToUser = makeReplyToUser(repo as any)

    await expect(replyToUser({ userId: 'u1', text: 'x' })).rejects.toThrow('db down')
  })
})
