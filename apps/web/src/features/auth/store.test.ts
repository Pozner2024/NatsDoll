import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './store'

const mockUser = { id: '1', name: 'Natasha', email: 'test@test.com', role: 'user' }

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

  it('register сохраняет пользователя', async () => {
    vi.stubGlobal('fetch', mockFetch({ accessToken: 'tok', user: mockUser }))
    const store = useAuthStore()
    await store.register({ name: 'Natasha', email: 'n@test.com', password: '123' })
    expect(store.isLoggedIn).toBe(true)
    expect(store.user?.name).toBe('Natasha')
  })
})
