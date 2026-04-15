// В dev `/api` проксируется Vite-сервером (vite.config.ts), в prod — nginx.
// Ничего настраивать через env не нужно.
const API_BASE = '/api'

type ApiRequestInit = Omit<RequestInit, 'body'> & { json?: unknown }

export async function apiFetch(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const { json, headers, ...rest } = init
  const mergedHeaders: Record<string, string> = {
    ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(headers as Record<string, string> | undefined),
  }
  return fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: mergedHeaders,
    body: json !== undefined ? JSON.stringify(json) : (rest as RequestInit).body,
  })
}

export async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}))
  return (data as { error?: string }).error ?? fallback
}
