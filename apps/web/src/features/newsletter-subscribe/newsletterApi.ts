function getApiUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (!url) throw new Error('VITE_API_URL is not defined')
  return url
}

export async function subscribeToNewsletter(email: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}/newsletter/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? 'Subscription failed')
  }
}
