import { defineNuxtPlugin } from 'nuxt/app'
import { setupAuthInterceptor } from '@/shared'
import { useAuthStore } from '@/entities/user'

export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  setupAuthInterceptor({
    getAccessToken: () => authStore.accessToken,
    setAccessToken: (token) => authStore.setAccessToken(token),
    clearAuth: () => authStore.clearState(),
  })
  void authStore.initAuth()
})
