import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSubscribe } from './subscribe'
import { confirmToken } from './confirm'
import type { NewsletterRepository, NewsletterSubscriber } from '../infrastructure/newsletterRepository'

const mockRepo: NewsletterRepository = {
  upsertSubscriber: vi.fn(),
  getAll: vi.fn(),
  deleteById: vi.fn(),
  deleteByEmail: vi.fn(),
  confirmByEmail: vi.fn(),
}

const emailService = { sendNewsletterConfirmation: vi.fn() }

function row(overrides: Partial<NewsletterSubscriber> = {}): NewsletterSubscriber {
  return { id: 's1', email: 'test@example.com', subscribedAt: new Date(), confirmedAt: null, ...overrides }
}

describe('subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(emailService.sendNewsletterConfirmation).mockResolvedValue(undefined)
  })

  it('сохраняет нормализованный email через репозиторий', async () => {
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(row())
    const subscribe = makeSubscribe(mockRepo, emailService)
    await subscribe('  Foo@Example.COM ')
    expect(mockRepo.upsertSubscriber).toHaveBeenCalledWith('foo@example.com')
  })

  it('шлёт письмо-подтверждение неподтверждённому адресу со ссылкой на /newsletter/confirm', async () => {
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(row())
    const subscribe = makeSubscribe(mockRepo, emailService)
    await subscribe('test@example.com')
    expect(emailService.sendNewsletterConfirmation).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining(`/newsletter/confirm?email=test%40example.com&token=${confirmToken('test@example.com')}`),
    )
  })

  it('НЕ шлёт письмо уже подтверждённому адресу', async () => {
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(row({ confirmedAt: new Date() }))
    const subscribe = makeSubscribe(mockRepo, emailService)
    await subscribe('test@example.com')
    expect(emailService.sendNewsletterConfirmation).not.toHaveBeenCalled()
  })

  it('сбой отправки письма не роняет подписку', async () => {
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(row())
    vi.mocked(emailService.sendNewsletterConfirmation).mockRejectedValue(new Error('resend down'))
    const subscribe = makeSubscribe(mockRepo, emailService)
    await expect(subscribe('test@example.com')).resolves.toBeUndefined()
  })
})
