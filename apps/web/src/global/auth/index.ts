// Public API for auth feature
// Only export what other features need; keep internals private

export { AuthLoginForm, AuthRegisterForm } from './components'
export { useAuth } from './composables'
export { useAuthStore } from './store'

// Types (optional, only if needed by consumers):
// export type { User, AuthApi } from './model'
