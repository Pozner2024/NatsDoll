import { describe, it, expect, vi } from 'vitest'
import { makeSubmit } from './submit'
import type { ContactRepository } from '../infrastructure/contactRepository'

const mockRepo: ContactRepository = {
  create: vi.fn(),
}

describe('submit', () => {
  it('сохраняет сообщение через репозиторий', async () => {
    vi.mocked(mockRepo.create).mockResolvedValue(undefined)
    const submit = makeSubmit(mockRepo)
    await submit({ name: 'Nat', email: 'nat@example.com', message: 'Hello' })
    expect(mockRepo.create).toHaveBeenCalledWith({
      name: 'Nat',
      email: 'nat@example.com',
      message: 'Hello',
    })
  })
})
