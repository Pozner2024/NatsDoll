import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCreateMessage } from './createMessage'
import { AppError } from '../../../shared/errors'

const repo = {
  findByUser: vi.fn(),
  create: vi.fn(),
}

const emailService = {
  sendVerificationEmail: vi.fn(),
  sendMessageNotification: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('createMessage', () => {
  it('creates message without order', async () => {
    repo.create.mockResolvedValue({
      message: { id: 'm1', text: 'Hello', orderId: null, orderNumber: null, createdAt: new Date().toISOString() },
      userName: 'Alice',
      userEmail: 'alice@example.com',
    })
    const createMessage = makeCreateMessage(repo as any, emailService as any)
    await createMessage('u1', { text: 'Hello' })
    expect(repo.create).toHaveBeenCalledWith('u1', { text: 'Hello' })
  })

  it('throws 400 when text is empty', async () => {
    const createMessage = makeCreateMessage(repo as any, emailService as any)
    await expect(createMessage('u1', { text: '   ' })).rejects.toThrow(AppError)
  })

  it('sends email notification when ADMIN_EMAIL is set', async () => {
    process.env.ADMIN_EMAIL = 'admin@example.com'
    repo.create.mockResolvedValue({
      message: { id: 'm1', text: 'Question', orderId: 'o1', orderNumber: 5, createdAt: new Date().toISOString() },
      userName: 'Alice',
      userEmail: 'alice@example.com',
    })
    const createMessage = makeCreateMessage(repo as any, emailService as any)
    await createMessage('u1', { text: 'Question', orderId: 'o1' })
    expect(emailService.sendMessageNotification).toHaveBeenCalledWith(
      'admin@example.com', 'Alice', 'alice@example.com', 'Question', 5,
    )
    delete process.env.ADMIN_EMAIL
  })
})
