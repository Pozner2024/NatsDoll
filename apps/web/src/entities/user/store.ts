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
import { apiFetch, authFetch, apiErrorMessage, refreshAccessToken } from '@/shared'
import { useCartStore } from '@/entities/cart'
import { useFavoritesStore } from '@/entities/favorites'

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

  function setAuth(token: string, nextUser: User) {
    accessToken.value = token
    user.value = nextUser
    void useCartStore().load(true)
    void useFavoritesStore().load(true)
  }

  function clearState(): void {
    accessToken.value = null
    user.value = null
    initPromise = null
    useCartStore().reset()
    useFavoritesStore().reset()
  }

  async function login(data: { email: string; password: string }): Promise<void> {
    const res = await apiFetch('/auth/login', { method: 'POST', json: data })
    if (!res.ok) throw new Error(await apiErrorMessage(res, 'Login failed'))
    const body = authResponseSchema.parse(await res.json())
    setAuth(body.accessToken, body.user)
  }

  async function register(data: { name: string; email: string; password: string }): Promise<'pending'> {
    const res = await apiFetch('/auth/register', { method: 'POST', json: data })
    if (!res.ok) throw new Error(await apiErrorMessage(res, 'Registration failed'))
    return 'pending'
  }

  async function verifyEmail(token: string): Promise<void> {
    const res = await apiFetch('/auth/verify-email', { method: 'POST', json: { token } })
    if (!res.ok) throw new Error(await apiErrorMessage(res, 'Email verification failed'))
    const body = authResponseSchema.parse(await res.json())
    setAuth(body.accessToken, body.user)
  }

  async function requestPasswordReset(email: string): Promise<void> {
    const res = await apiFetch('/auth/forgot-password', { method: 'POST', json: { email } })
    if (!res.ok) throw new Error(await apiErrorMessage(res, 'Request failed'))
  }

  async function resetPassword(token: string, password: string): Promise<void> {
    const res = await apiFetch('/auth/reset-password', { method: 'POST', json: { token, password } })
    if (!res.ok) throw new Error(await apiErrorMessage(res, 'Reset failed'))
    const body = authResponseSchema.parse(await res.json())
    setAuth(body.accessToken, body.user)
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch('/auth/logout', { method: 'POST', accessToken: accessToken.value ?? undefined })
    } finally {
      clearState()
    }
  }

  async function fetchMe(token: string): Promise<User | null> {
    const meRes = await apiFetch('/auth/me', { accessToken: token })
    if (!meRes.ok) return null
    const meBody = meResponseSchema.parse(await meRes.json())
    return meBody.user
  }

  async function initAuth(): Promise<void> {
    if (initPromise) return initPromise
    initPromise = _doInitAuth()
    return initPromise
  }

  async function _doInitAuth(): Promise<void> {
    try {
      const token = await refreshAccessToken()
      if (!token) return
      const meUser = await fetchMe(token)
      if (meUser) setAuth(token, meUser)
    } catch {
      // тихий фейл — пользователь просто остаётся неавторизованным
    } finally {
      authReady.value = true
      initPromise = null
    }
  }

  async function updateProfile(data: { name?: string; password?: string; currentPassword?: string }): Promise<void> {
    const res = await authFetch('/auth/me', {
      method: 'PATCH',
      json: data,
    })
    if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to update profile'))
    const body = z.object({ user: userSchema }).parse(await res.json())
    user.value = body.user
  }

  return {
    user: readonly(user),
    accessToken: readonly(accessToken),
    isLoggedIn,
    authReady: readonly(authReady),
    login,
    register,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    logout,
    clearState,
    initAuth,
    setAccessToken,
    updateProfile,
  }
})
