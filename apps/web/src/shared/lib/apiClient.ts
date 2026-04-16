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
