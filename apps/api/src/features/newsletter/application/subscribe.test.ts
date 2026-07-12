import { describe, it, expect, vi } from 'vitest'
import { makeSubscribe } from './subscribe'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'

const mockRepo: NewsletterRepository = {
  upsertSubscriber: vi.fn(),
  getAll: vi.fn(),
  deleteById: vi.fn(),
  deleteByEmail: vi.fn(),
}

describe('subscribe', () => {
  it('сохраняет email через репозиторий', async () => {
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(undefined)
    const subscribe = makeSubscribe(mockRepo)
    await subscribe('test@example.com')
    expect(mockRepo.upsertSubscriber).toHaveBeenCalledWith('test@example.com')
  })

  it('нормализует email: trim + lowercase', async () => {
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(undefined)
    const subscribe = makeSubscribe(mockRepo)
    await subscribe('  Foo@Example.COM ')
    expect(mockRepo.upsertSubscriber).toHaveBeenCalledWith('foo@example.com')
  })
})
