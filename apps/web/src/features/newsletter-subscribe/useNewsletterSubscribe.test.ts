import { describe, it, expect, vi, afterEach } from 'vitest'
import { useNewsletterSubscribe } from './useNewsletterSubscribe'

vi.mock('./newsletterApi', () => ({
  subscribeToNewsletter: vi.fn(),
}))

import { subscribeToNewsletter } from './newsletterApi'

afterEach(() => {
  vi.clearAllMocks()
})

describe('useNewsletterSubscribe — начальное состояние', () => {
  it('state равен idle', () => {
    const { state } = useNewsletterSubscribe()
    expect(state.value).toBe('idle')
  })

  it('email пустой', () => {
    const { email } = useNewsletterSubscribe()
    expect(email.value).toBe('')
  })

  it('errorMessage пустой', () => {
    const { errorMessage } = useNewsletterSubscribe()
    expect(errorMessage.value).toBe('')
  })
})

describe('useNewsletterSubscribe — успешная отправка', () => {
  it('переходит в success и сбрасывает email', async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue(undefined)

    const { email, state, handleSubmit } = useNewsletterSubscribe()
    email.value = 'test@example.com'

    await handleSubmit()

    expect(state.value).toBe('success')
    expect(email.value).toBe('')
  })

  it('вызывает subscribeToNewsletter с текущим email', async () => {
    vi.mocked(subscribeToNewsletter).mockResolvedValue(undefined)

    const { email, handleSubmit } = useNewsletterSubscribe()
    email.value = 'user@mail.com'

    await handleSubmit()

    expect(subscribeToNewsletter).toHaveBeenCalledWith('user@mail.com')
  })
})

describe('useNewsletterSubscribe — ошибка при отправке', () => {
  it('переходит в error и сохраняет сообщение ошибки', async () => {
    vi.mocked(subscribeToNewsletter).mockRejectedValue(new Error('Email already subscribed'))

    const { email, state, errorMessage, handleSubmit } = useNewsletterSubscribe()
    email.value = 'test@example.com'

    await handleSubmit()

    expect(state.value).toBe('error')
    expect(errorMessage.value).toBe('Email already subscribed')
  })

  it('использует fallback-сообщение если err не является Error', async () => {
    vi.mocked(subscribeToNewsletter).mockRejectedValue('unexpected')

    const { email, state, errorMessage, handleSubmit } = useNewsletterSubscribe()
    email.value = 'test@example.com'

    await handleSubmit()

    expect(state.value).toBe('error')
    expect(errorMessage.value).toBe('Subscription failed')
  })

  it('сбрасывает errorMessage перед повторной отправкой', async () => {
    vi.mocked(subscribeToNewsletter)
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValue(undefined)

    const { email, errorMessage, handleSubmit } = useNewsletterSubscribe()
    email.value = 'test@example.com'

    await handleSubmit()
    expect(errorMessage.value).toBe('First error')

    email.value = 'test@example.com'
    await handleSubmit()
    expect(errorMessage.value).toBe('')
  })
})

describe('useNewsletterSubscribe — клиентская валидация', () => {
  it('показывает ошибку при пустом email и не вызывает API', async () => {
    const { state, errorMessage, handleSubmit } = useNewsletterSubscribe()

    await handleSubmit()

    expect(state.value).toBe('error')
    expect(errorMessage.value).toBe('Please enter your email')
    expect(subscribeToNewsletter).not.toHaveBeenCalled()
  })

  it('показывает ошибку при неверном формате email', async () => {
    const { email, state, errorMessage, handleSubmit } = useNewsletterSubscribe()
    email.value = 'not-an-email'

    await handleSubmit()

    expect(state.value).toBe('error')
    expect(errorMessage.value).toBe('Invalid email format')
    expect(subscribeToNewsletter).not.toHaveBeenCalled()
  })
})
