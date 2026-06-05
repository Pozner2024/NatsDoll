import { describe, it, expect, vi } from 'vitest'
import { makeSubmit } from './submit'
import type { ContactRepository } from '../infrastructure/contactRepository'
import type { EmailService } from '../../auth/infrastructure/emailService'

const mockRepo: ContactRepository = {
  create: vi.fn(),
}

const mockEmailService = {
  sendContactNotification: vi.fn().mockResolvedValue(undefined),
} as unknown as EmailService

describe('submit', () => {
  it('сохраняет сообщение через репозиторий', async () => {
    vi.mocked(mockRepo.create).mockResolvedValue(undefined)
    const submit = makeSubmit(mockRepo, mockEmailService)
    await submit({ name: 'Nat', email: 'nat@example.com', message: 'Hello' })
    expect(mockRepo.create).toHaveBeenCalledWith({
      name: 'Nat',
      email: 'nat@example.com',
      message: 'Hello',
    })
  })
})
