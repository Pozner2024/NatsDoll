import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './store'

const mockUser = { id: '1', name: 'Natasha', email: 'test@test.com', role: 'CUSTOMER' }

function mockFetch(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  })
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('начальное состояние — не авторизован', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('login сохраняет пользователя', async () => {
    vi.stubGlobal('fetch', mockFetch({ accessToken: 'tok', user: mockUser }))
    const store = useAuthStore()
    await store.login({ email: 'test@test.com', password: '123' })
    expect(store.isLoggedIn).toBe(true)
    expect(store.user?.email).toBe('test@test.com')
  })

  it('logout сбрасывает пользователя', async () => {
    vi.stubGlobal('fetch', mockFetch({ accessToken: 'tok', user: mockUser }))
    const store = useAuthStore()
    await store.login({ email: 'test@test.com', password: '123' })
    vi.stubGlobal('fetch', mockFetch({}))
    await store.logout()
    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('register возвращает pending и не авторизует пользователя (нужна email-верификация)', async () => {
    vi.stubGlobal('fetch', mockFetch({ message: 'Check your email to verify your account' }))
    const store = useAuthStore()
    const result = await store.register({ name: 'Natasha', email: 'n@test.com', password: '123' })
    expect(result).toBe('pending')
    expect(store.isLoggedIn).toBe(false)
    expect(store.user).toBeNull()
  })

  describe('loginWithToken', () => {
    it('авторизует пользователя по токену', async () => {
      vi.stubGlobal('fetch', mockFetch({ user: mockUser }))
      const store = useAuthStore()
      await store.loginWithToken('my_access_token')
      expect(store.isLoggedIn).toBe(true)
      expect(store.user?.email).toBe('test@test.com')
      expect(store.authReady).toBe(true)
    })

    it('не авторизует если /me вернул ошибку', async () => {
      vi.stubGlobal('fetch', mockFetch({}, false))
      const store = useAuthStore()
      await store.loginWithToken('bad_token')
      expect(store.isLoggedIn).toBe(false)
      expect(store.user).toBeNull()
      expect(store.authReady).toBe(true)
    })

    it('записывает initPromise — повторный initAuth не делает новый запрос', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      })
      vi.stubGlobal('fetch', fetchMock)
      const store = useAuthStore()
      const p1 = store.loginWithToken('tok')
      const p2 = store.initAuth() // должен вернуть тот же promise
      await Promise.all([p1, p2])
      // /me вызывается только один раз, так как initPromise уже занят
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })
})
