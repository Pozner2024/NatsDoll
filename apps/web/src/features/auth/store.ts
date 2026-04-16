// apps/web/src/features/auth/store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from './types'
import { apiFetch, apiErrorMessage } from '@/shared'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const isLoggedIn = computed(() => user.value !== null)

  async function login(data: { email: string; password: string }): Promise<void> {
    const res = await apiFetch('/auth/login', { method: 'POST', json: data })
    if (!res.ok) throw new Error(await apiErrorMessage(res, 'Login failed'))
    const body = await res.json() as { accessToken: string; user: User }
    accessToken.value = body.accessToken
    user.value = body.user
  }

  async function register(data: { name: string; email: string; password: string }): Promise<void> {
    const res = await apiFetch('/auth/register', { method: 'POST', json: data })
    if (!res.ok) throw new Error(await apiErrorMessage(res, 'Registration failed'))
    const body = await res.json() as { accessToken: string; user: User }
    accessToken.value = body.accessToken
    user.value = body.user
  }

  async function logout(): Promise<void> {
    await apiFetch('/auth/logout', { method: 'POST', accessToken: accessToken.value ?? undefined })
    accessToken.value = null
    user.value = null
  }

  async function initAuth(): Promise<void> {
    try {
      const res = await apiFetch('/auth/refresh', { method: 'POST' })
      if (!res.ok) return
      const body = await res.json() as { accessToken: string }
      accessToken.value = body.accessToken

      const meRes = await apiFetch('/auth/me', { accessToken: body.accessToken })
      if (!meRes.ok) return
      const meBody = await meRes.json() as { user: User }
      user.value = meBody.user
    } catch {
      // тихий фейл — пользователь просто остаётся неавторизованным
    }
  }

  return { user, accessToken, isLoggedIn, login, register, logout, initAuth }
})
