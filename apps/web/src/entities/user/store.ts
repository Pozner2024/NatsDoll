// Централизованное хранилище Pinia для управления состоянием аутентификации пользователя.
//  Основные функции:
//  - Управление сессией: хранение данных профиля (User) и Access Token в памяти приложения.
//  - Инкапсуляция Auth API: реализация методов входа (login), регистрации (register) и выхода (logout).
//  - Механизм Silent Refresh: автоматическое восстановление сессии через Refresh Token в httpOnly cookies.
//  - Валидация данных: использование Zod-схем для строгой проверки ответов от бэкенда.
//  Безопасность:
//  - Состояние экспортируется как readonly, изменения возможны только через экшены стора.
//  - Access Token не сохраняется в LocalStorage для предотвращения XSS-атак.
import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { z } from 'zod'
import type { User } from './types'
import { apiFetch, apiErrorMessage } from '@/shared'

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['CUSTOMER', 'ADMIN']),
})

const authResponseSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
})

const refreshResponseSchema = z.object({
  accessToken: z.string(),
})

const meResponseSchema = z.object({
  user: userSchema,
})

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const isLoggedIn = computed(() => user.value !== null)
  const authReady = ref(false)

  let initPromise: Promise<void> | null = null

  function setAccessToken(token: string) {
    accessToken.value = token
  }

  async function login(data: { email: string; password: string }): Promise<void> {
    const res = await apiFetch('/auth/login', { method: 'POST', json: data })
    if (!res.ok) throw new Error(await apiErrorMessage(res, 'Login failed'))
    const body = authResponseSchema.parse(await res.json())
    accessToken.value = body.accessToken
    user.value = body.user
  }

  async function register(data: { name: string; email: string; password: string }): Promise<'pending'> {
    const res = await apiFetch('/auth/register', { method: 'POST', json: data })
    if (!res.ok) throw new Error(await apiErrorMessage(res, 'Registration failed'))
    return 'pending'
  }

  function clearState(): void {
    accessToken.value = null
    user.value = null
    initPromise = null
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch('/auth/logout', { method: 'POST', accessToken: accessToken.value ?? undefined })
    } finally {
      clearState()
    }
  }

  async function initAuth(): Promise<void> {
    if (initPromise) return initPromise
    initPromise = _doInitAuth()
    return initPromise
  }

  async function _doInitAuth(): Promise<void> {
    try {
      const res = await apiFetch('/auth/refresh', { method: 'POST' })
      if (!res.ok) return
      const body = refreshResponseSchema.parse(await res.json())
      accessToken.value = body.accessToken

      const meRes = await apiFetch('/auth/me', { accessToken: body.accessToken })
      if (!meRes.ok) return
      const meBody = meResponseSchema.parse(await meRes.json())
      user.value = meBody.user
    } catch {
      // тихий фейл — пользователь просто остаётся неавторизованным
    } finally {
      authReady.value = true
      initPromise = null
    }
  }

  async function loginWithToken(token: string): Promise<void> {
    if (initPromise) await initPromise
    initPromise = _doLoginWithToken(token)
    return initPromise
  }

  async function _doLoginWithToken(token: string): Promise<void> {
    accessToken.value = token
    try {
      const meRes = await apiFetch('/auth/me', { accessToken: token })
      if (!meRes.ok) {
        accessToken.value = null
        return
      }
      const meBody = meResponseSchema.parse(await meRes.json())
      user.value = meBody.user
    } catch {
      accessToken.value = null
    } finally {
      authReady.value = true
      initPromise = null
    }
  }

  return {
    user: readonly(user),
    accessToken: readonly(accessToken),
    isLoggedIn,
    authReady: readonly(authReady),
    login,
    register,
    logout,
    clearState,
    initAuth,
    loginWithToken,
    setAccessToken,
  }
})
