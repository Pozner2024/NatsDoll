import { serve } from '@hono/node-server'
import { createApp } from './app'

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL env variable is required in production')
}

const port = Number(process.env.PORT || 3000)

const app = createApp()

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`)
})
