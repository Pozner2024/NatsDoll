import { describe, it, expect, vi } from 'vitest'
import { makeGetSubscribers } from './getSubscribers'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'

const mockRepo: NewsletterRepository = {
  upsertSubscriber: vi.fn(),
  getAll: vi.fn(),
  deleteById: vi.fn(),
}

describe('getSubscribers', () => {
  it('возвращает список подписчиков из репозитория', async () => {
    const subscribers = [
      { id: '1', email: 'a@example.com', subscribedAt: new Date('2026-01-01') },
      { id: '2', email: 'b@example.com', subscribedAt: new Date('2026-01-02') },
    ]
    vi.mocked(mockRepo.getAll).mockResolvedValue(subscribers)

    const getSubscribers = makeGetSubscribers(mockRepo)
    const result = await getSubscribers()

    expect(result).toEqual(subscribers)
  })
})
