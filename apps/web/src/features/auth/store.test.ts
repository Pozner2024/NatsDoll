import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './store'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('начальное состояние — не авторизован', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('login сохраняет пользователя', async () => {
    const store = useAuthStore()
    await store.login({ email: 'test@test.com', password: '123' })
    expect(store.isLoggedIn).toBe(true)
    expect(store.user).not.toBeNull()
    expect(store.user?.email).toBe('test@test.com')
  })

  it('logout сбрасывает пользователя', async () => {
    const store = useAuthStore()
    await store.login({ email: 'test@test.com', password: '123' })
    store.logout()
    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('register сохраняет пользователя', async () => {
    const store = useAuthStore()
    await store.register({ name: 'Natasha', email: 'n@test.com', password: '123' })
    expect(store.isLoggedIn).toBe(true)
    expect(store.user?.name).toBe('Natasha')
  })
})
