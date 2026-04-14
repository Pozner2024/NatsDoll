const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function sendContactMessage(data: {
  name: string
  email: string
  message: string
}): Promise<void> {
  const res = await fetch(`${API_BASE}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to send message')
}
