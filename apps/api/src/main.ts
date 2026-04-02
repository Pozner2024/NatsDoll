import { createApp } from './app'

const port = Number(process.env.PORT || 3000)

const app = createApp()

console.log(`🚀 API starting on port ${port}`)
console.log(`✓ Ready to listen on port ${port}`)

// For development, export the app for use with a server adapter
export default app
export { createApp }
