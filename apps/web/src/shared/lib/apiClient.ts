import { z } from 'zod'

const API_BASE = '/api'

const refreshSchema = z.object({ accessToken: z.string() })

type ApiRequestInit = Omit<RequestInit, 'body'> & {
  json?: unknown
  accessToken?: string
}
// **`apiFetch` (Базовая обертка)**:
// Это улучшенная версия встроенного в браузер `fetch`. Она автоматически добавляет базовый путь `/api` ко 
// всем запросам [1].
// Авто-заголовки**: Если вы передаете объект в поле `json`, функция сама добавит заголовок `Content-Type:  
// application/json` и превратит объект в строку [1].
// Безопасность**: Установлен параметр `credentials: 'include'`, который критически важен для передачи      
// защищенных кук (Cookies) между фронтендом и бэкендом (например, для Refresh-токена)
//  `credentials` — это «разрешение» на передачу секретного ключа (Refresh Token) в защищенном конверте      
// (Cookie) между сайтом и его сервером 
export async function apiFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const { json, headers, accessToken, ...rest } = init
  const mergedHeaders: Record<string, string> = {
    ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(headers as Record<string, string> | undefined),
  }
  return fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: mergedHeaders,
    body: json !== undefined ? JSON.stringify(json) : (rest as RequestInit).body,
  })
}
//  Утилита, которая пытается «вытащить» понятный текст ошибки из JSON-ответа сервера. Если сервер не прислал  
// текст ошибки, она возвращает запасной вариант (fallback), который указан
export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}))
  return (data as { error?: string }).error ?? fallback
}

let authCallbacks: {
  getAccessToken: () => string | null
  setAccessToken: (token: string) => void
  clearAuth: () => void
} | null = null

export function setupAuthInterceptor(cb: NonNullable<typeof authCallbacks>) {
  authCallbacks = cb
}

let refreshPromise: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  const res = await apiFetch('/auth/refresh', { method: 'POST' })
  if (!res.ok) return null
  const body = refreshSchema.parse(await res.json())
  return body.accessToken
}
// authFetch (Умный клиент с авто-обновлением):
// Это «продвинутая» функция, которая используется для запросов, требующих авторизации.
// Механизм перехвата (Interceptor): Перед отправкой запроса она берет актуальный `accessToken` из вашего 
// `authStore`.
// Silent Refresh (Тихое обновление): Если сервер отвечает ошибкой **401 (Unauthorized)**, клиент не      
// выбрасывает ошибку сразу. Вместо этого он:
//         1.  Приостанавливает текущий запрос.
//         2.  Вызывает функцию `doRefresh`, которая идет на эндпоинт `/api/auth/refresh`, чтобы получить новый токен 
// доступа.
//         3.  Если обновление прошло успешно, он сохраняет новый токен и **повторяет ваш изначальный запрос** уже с  
// новыми данными.
//         4.  Если же обновить токен не удалось (например, сессия истекла совсем), он вызывает `clearAuth()`,        
// разлогинивая пользователя.
export async function authFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  if (!authCallbacks) return apiFetch(path, init)

  const token = authCallbacks.getAccessToken()
  const res = await apiFetch(path, { ...init, accessToken: token ?? undefined })

  if (res.status !== 401 || !token) return res

  if (!refreshPromise) {
    refreshPromise = doRefresh().catch(() => null).finally(() => { refreshPromise = null })
  }
  const newToken = await refreshPromise

  if (!newToken) {
    authCallbacks.clearAuth()
    return res
  }

  authCallbacks.setAccessToken(newToken)
  return apiFetch(path, { ...init, accessToken: newToken })
}
// Почему это сделано именно так?
// Такая архитектура (согласно docs/architecture.md) позволяет хранить `accessToken` только в оперативной  
// памяти (реактивной переменной), что защищает его от кражи через XSS-атаки, при этом механизм авто-обновления в     
// `apiClient` делает работу со страницей бесшовной для пользователя.