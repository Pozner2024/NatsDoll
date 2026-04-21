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

  async function loginFromCookie(): Promise<void> {
    initPromise = _doInitAuth()
    return initPromise
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
    loginFromCookie,
    setAccessToken,
  }
})
// Этот стор (хранилище **Pinia**) можно представить как **«главного администратора»** на входе в здание. Он отвечает за то, 
// чтобы узнавать пользователей, выдавать им пропуска и следить, чтобы они не заходили туда, куда им нельзя.
// Вот как он работает «на пальцах» и где он подключается в коде:
// ### 1. Как работает стор (ELI5 — просто о сложном)
// *   **У него есть «память» (State):** Он помнит, кто сейчас залогинен (`user`) и есть ли у него специальный «ключ» для 
// запросов к серверу (`accessToken`). 
// *   **Он умеет «проверять документы» (Actions):** 
//     *   Когда ты вводишь логин и пароль, метод **`login`** отправляет их на сервер. Если всё верно, сервер дает «ключ», 
// который стор кладет себе в карман.
//     *   Если ты закрыл и снова открыл сайт, стор вызывает **`initAuth`**. Он тихо спрашивает сервер: «У меня тут в печеньках
// (cookies) осталась старая метка, дашь мне новый ключ?». Если сервер кивает, ты входишь автоматически.
// *   **Безопасность:** Стор хранит «ключ» (`accessToken`) только в своей оперативной памяти. Если ты обновишь страницу, ключ 
// исчезнет, и стор тут же побежит за новым, используя защищенную метку из куки.
// ### 2. Где он подключается?
// Стор не просто лежит в папке, он интегрирован в «кровеносную» и «нервную» системы приложения:
// *   **В главной точке входа (`main.ts`):** Как только приложение запускается, стор подключается к **сетевому перехватчику   
// (Interceptor)**.
//     *   Это значит, что при каждом запросе к серверу (например, «дай список товаров»), система автоматически лезет в стор,  
// берет оттуда `accessToken` и прикрепляет его к письму для сервера.
//     *   Если сервер ответит «Ключ не подходит!», стор тут же попробует его обновить или выкинет пользователя из системы.
// *   **В навигаторе (`router/index.ts`):** Стор работает «охранником» на дверях страниц.
//     *   Перед тем как пустить тебя на страницу «Личный кабинет», роутер спрашивает у стора: **`isLoggedIn?`**.
//     *   Если стор говорит «Нет», роутер не дает тебе пройти и вместо этого открывает окно входа (`AuthModal`).
// *   **В компонентах интерфейса:** Например, в шапке сайта (`AppHeader`). Если стор говорит, что пользователь вошел, шапка   
// показывает кнопку «Выход» и имя пользователя. Если нет — кнопку «Войти».
// **Итог:** Стор — это единственный источник правды об авторизации, к которому обращаются и сетевые запросы, и страницы сайта,
// и кнопки в меню.