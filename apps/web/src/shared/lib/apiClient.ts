import { z } from 'zod'

const API_BASE = '/api'
const REQUEST_TIMEOUT_MS = 15000

const refreshSchema = z.object({ accessToken: z.string() })

type ApiRequestInit = RequestInit & {
  json?: unknown
  accessToken?: string
  // Таймаут запроса в мс. null отключает таймаут (например, для больших загрузок).
  timeoutMs?: number | null
}

// AbortSignal.any доступен только в свежих браузерах (Safari 17.4+, Firefox 124+).
// На старых связываем сигналы вручную, чтобы не уронить страницу TypeError'ом.
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals)
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  for (const s of signals) {
    if (s.aborted) {
      controller.abort()
      break
    }
    s.addEventListener('abort', onAbort, { once: true })
  }
  return controller.signal
}

/**
 * Базовая обертка над встроенным `fetch` для работы с API нашего приложения.
 * Автоматически подставляет префикс `/api`, обрабатывает JSON-тело запроса
 * и добавляет токен авторизации (Bearer), если он был передан.
 */
export async function apiFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const { json, headers, accessToken, timeoutMs = REQUEST_TIMEOUT_MS, ...rest } = init
  const mergedHeaders: Record<string, string> = {
    ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(headers as Record<string, string> | undefined),
  }
  const timeoutSignal = timeoutMs == null ? null : AbortSignal.timeout(timeoutMs)
  const signals = [rest.signal, timeoutSignal].filter((s): s is AbortSignal => s != null)
  const signal = signals.length > 1 ? anySignal(signals) : signals[0]
  return fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: mergedHeaders,
    signal,
    body: json !== undefined ? JSON.stringify(json) : (rest as RequestInit).body,
  })
}

export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}))
  return (data as { error?: string }).error ?? fallback
}

export async function apiPost(path: string, body?: unknown, fallback = 'Request failed'): Promise<void> {
  const res = await apiFetch(path, { method: 'POST', json: body })
  if (!res.ok) throw new Error(await apiErrorMessage(res, fallback))
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

/**
 * Главная функция для выполнения защищенных запросов (требующих авторизации).
 * Обладает встроенным механизмом "перехвата" (interceptor):
 * Если токен протух (ошибка 401), функция автоматически приостанавливает запрос,
 * обращается к серверу за новым токеном (refresh), сохраняет его и незаметно повторяет 
 * оригинальный запрос, так что пользователь не видит никакой ошибки.
 */
export async function authFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  if (!authCallbacks) return apiFetch(path, init)

  const token = authCallbacks.getAccessToken()
  const res = await apiFetch(path, { ...init, accessToken: token ?? undefined })

  if (res.status !== 401) return res

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