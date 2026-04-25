if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL is required in production')
}

export const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
