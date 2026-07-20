import { describe, it, expect } from 'vitest'
import { createApp } from './app'

describe('app error handling', () => {
  it('битый JSON в теле → 400, не 500', async () => {
    const app = createApp()
    const res = await app.request('/newsletter/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email": broken',
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Malformed JSON in request body' })
  })
})
