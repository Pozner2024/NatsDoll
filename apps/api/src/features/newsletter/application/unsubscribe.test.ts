import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeUnsubscribe, unsubscribeToken } from './unsubscribe'
import { AppError } from '../../../shared/errors'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'

const mockRepo: NewsletterRepository = {
  upsertSubscriber: vi.fn(),
  getAll: vi.fn(),
  deleteById: vi.fn(),
  deleteByEmail: vi.fn(),
  confirmByEmail: vi.fn(),
}

describe('unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockRepo.deleteByEmail).mockResolvedValue(undefined)
  })

  it('удаляет подписчика при валидном токене', async () => {
    const unsubscribe = makeUnsubscribe(mockRepo)
    await unsubscribe('test@example.com', unsubscribeToken('test@example.com'))
    expect(mockRepo.deleteByEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('токен не зависит от регистра и пробелов в email', async () => {
    const unsubscribe = makeUnsubscribe(mockRepo)
    await unsubscribe('  Test@Example.COM ', unsubscribeToken('test@example.com'))
    expect(mockRepo.deleteByEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('отклоняет неверный токен с 400', async () => {
    const unsubscribe = makeUnsubscribe(mockRepo)
    await expect(unsubscribe('test@example.com', 'wrong-token')).rejects.toThrow(AppError)
    expect(mockRepo.deleteByEmail).not.toHaveBeenCalled()
  })

  it('отклоняет токен от другого email', async () => {
    const unsubscribe = makeUnsubscribe(mockRepo)
    await expect(unsubscribe('test@example.com', unsubscribeToken('other@example.com'))).rejects.toThrow(AppError)
    expect(mockRepo.deleteByEmail).not.toHaveBeenCalled()
  })
})
