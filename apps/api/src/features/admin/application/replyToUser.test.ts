import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeReplyToUser } from './replyToUser'

const repo = { replyToUser: vi.fn() }
const emailService = { sendReplyNotification: vi.fn() }

beforeEach(() => {
  vi.clearAllMocks()
  repo.replyToUser.mockResolvedValue({ userEmail: 'user@example.com', userName: 'Anna' })
  emailService.sendReplyNotification.mockResolvedValue(undefined)
})

describe('replyToUser', () => {
  it('делегирует input в repo.replyToUser', async () => {
    const replyToUser = makeReplyToUser(repo as never, emailService as never)

    const input = { userId: 'u1', text: 'Привет!', orderId: 'o1' }
    await replyToUser(input)

    expect(repo.replyToUser).toHaveBeenCalledWith(input)
  })

  it('отправляет email-уведомление покупателю после сохранения ответа', async () => {
    const replyToUser = makeReplyToUser(repo as never, emailService as never)

    await replyToUser({ userId: 'u1', text: 'Ваш заказ готов' })

    expect(emailService.sendReplyNotification).toHaveBeenCalledWith('user@example.com', 'Anna', 'Ваш заказ готов')
  })

  it('ошибка отправки письма не роняет ответ (fire-and-forget)', async () => {
    emailService.sendReplyNotification.mockRejectedValue(new Error('resend down'))
    const replyToUser = makeReplyToUser(repo as never, emailService as never)

    await expect(replyToUser({ userId: 'u1', text: 'x' })).resolves.toBeUndefined()
  })

  it('пробрасывает ошибку репозитория наверх и не шлёт письмо', async () => {
    repo.replyToUser.mockRejectedValue(new Error('db down'))
    const replyToUser = makeReplyToUser(repo as never, emailService as never)

    await expect(replyToUser({ userId: 'u1', text: 'x' })).rejects.toThrow('db down')
    expect(emailService.sendReplyNotification).not.toHaveBeenCalled()
  })
})
