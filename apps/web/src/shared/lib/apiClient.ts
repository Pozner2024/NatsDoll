// apps/web/src/shared/lib/apiClient.ts
// В dev `/api` проксируется Vite-сервером (vite.config.ts), в prod — nginx.
const API_BASE = '/api'

type ApiRequestInit = Omit<RequestInit, 'body'> & {
  json?: unknown
  accessToken?: string
}

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

export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}))
  return (data as { error?: string }).error ?? fallback
}

/**
 * Обёртка для авторизованных запросов: при 401 пытается обновить токен и повторить.
 * getAccessToken / setAccessToken / clearAuth — замыкания на store, передаются при инициализации.
 */
let authCallbacks: {
  getAccessToken: () => string | null
  setAccessToken: (token: string) => void
  clearAuth: () => void
} | null = null

export function setupAuthInterceptor(callbacks: {
  getAccessToken: () => string | null
  setAccessToken: (token: string) => void
  clearAuth: () => void
}) {
  authCallbacks = callbacks
}

let refreshPromise: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  const res = await apiFetch('/auth/refresh', { method: 'POST' })
  if (!res.ok) return null
  const body = await res.json() as { accessToken: string }
  return body.accessToken
}

export async function authFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  if (!authCallbacks) return apiFetch(path, init)

  const token = authCallbacks.getAccessToken()
  const res = await apiFetch(path, { ...init, accessToken: token ?? undefined })

  if (res.status !== 401 || !token) return res

  // Singleton refresh — параллельные 401 делят один запрос
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null })
  }
  const newToken = await refreshPromise

  if (!newToken) {
    authCallbacks.clearAuth()
    return res
  }

  authCallbacks.setAccessToken(newToken)
  return apiFetch(path, { ...init, accessToken: newToken })
}
