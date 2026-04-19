export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

// TODO: restore HTTPS check when SSL is configured
if (process.env.NODE_ENV === 'production' && !FRONTEND_URL.startsWith('http')) {
  throw new Error('FRONTEND_URL is required in production')
}
