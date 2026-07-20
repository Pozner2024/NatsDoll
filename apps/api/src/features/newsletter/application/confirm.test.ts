import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeConfirm, confirmToken } from './confirm'
import { unsubscribeToken } from './unsubscribe'
import { AppError } from '../../../shared/errors'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'

const mockRepo: NewsletterRepository = {
  upsertSubscriber: vi.fn(),
  getAll: vi.fn(),
  deleteById: vi.fn(),
  deleteByEmail: vi.fn(),
  confirmByEmail: vi.fn(),
}

describe('confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockRepo.confirmByEmail).mockResolvedValue(undefined)
  })

  it('подтверждает подписку при валидном токене', async () => {
    const confirm = makeConfirm(mockRepo)
    await confirm('test@example.com', confirmToken('test@example.com'))
    expect(mockRepo.confirmByEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('токен не зависит от регистра и пробелов в email', async () => {
    const confirm = makeConfirm(mockRepo)
    await confirm('  Test@Example.COM ', confirmToken('test@example.com'))
    expect(mockRepo.confirmByEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('отклоняет неверный токен с 400', async () => {
    const confirm = makeConfirm(mockRepo)
    await expect(confirm('test@example.com', 'wrong-token')).rejects.toThrow(AppError)
    expect(mockRepo.confirmByEmail).not.toHaveBeenCalled()
  })

  it('отклоняет токен от другого email', async () => {
    const confirm = makeConfirm(mockRepo)
    await expect(confirm('test@example.com', confirmToken('other@example.com'))).rejects.toThrow(AppError)
    expect(mockRepo.confirmByEmail).not.toHaveBeenCalled()
  })

  it('confirm-токен не совпадает с unsubscribe-токеном того же email', () => {
    expect(confirmToken('test@example.com')).not.toBe(unsubscribeToken('test@example.com'))
  })
})
