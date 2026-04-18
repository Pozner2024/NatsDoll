export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'

if (process.env.NODE_ENV === 'production' && !FRONTEND_URL.startsWith('https://')) {
  throw new Error('FRONTEND_URL must use HTTPS in production')
}
