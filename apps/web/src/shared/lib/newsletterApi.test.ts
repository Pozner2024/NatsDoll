import { describe, it, expect, vi, afterEach } from 'vitest'
import { subscribeToNewsletter } from './newsletterApi'

function mockFetch(overrides: Partial<Response> & { jsonBody?: unknown } = {}) {
  const { jsonBody, ...rest } = overrides
  const response = {
    ok: true,
    json: jsonBody !== undefined
      ? vi.fn().mockResolvedValue(jsonBody)
      : vi.fn().mockRejectedValue(new SyntaxError('No body')),
    ...rest,
  } as unknown as Response

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('subscribeToNewsletter — успешный вызов', () => {
  it('вызывает fetch с путём /newsletter/subscribe и методом POST', async () => {
    mockFetch({ ok: true })
    await subscribeToNewsletter('test@example.com')

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/newsletter/subscribe'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('передаёт email в теле запроса', async () => {
    mockFetch({ ok: true })
    await subscribeToNewsletter('user@mail.com')

    const [, options] = vi.mocked(fetch).mock.calls[0]
    expect((options as RequestInit).body).toBe(JSON.stringify({ email: 'user@mail.com' }))
  })

  it('передаёт заголовок Content-Type: application/json', async () => {
    mockFetch({ ok: true })
    await subscribeToNewsletter('test@example.com')

    const [, options] = vi.mocked(fetch).mock.calls[0]
    expect((options as RequestInit).headers).toEqual(
      expect.objectContaining({ 'Content-Type': 'application/json' }),
    )
  })

  it('не бросает ошибку при ok-ответе', async () => {
    mockFetch({ ok: true })
    await expect(subscribeToNewsletter('test@example.com')).resolves.toBeUndefined()
  })
})

describe('subscribeToNewsletter — ошибочный ответ с телом', () => {
  it('бросает ошибку с текстом из поля error', async () => {
    mockFetch({ ok: false, jsonBody: { error: 'Email already subscribed' } })
    await expect(subscribeToNewsletter('test@example.com')).rejects.toThrow('Email already subscribed')
  })
})

describe('subscribeToNewsletter — ошибочный ответ без тела', () => {
  it('использует fallback-сообщение когда json() бросает исключение', async () => {
    mockFetch({ ok: false })
    await expect(subscribeToNewsletter('test@example.com')).rejects.toThrow('Ошибка подписки')
  })
})
