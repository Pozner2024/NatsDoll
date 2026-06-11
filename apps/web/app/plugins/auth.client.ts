import { defineNuxtPlugin } from 'nuxt/app'
import { setupAuthInterceptor } from '@/shared'
import { useAuthStore } from '@/entities/user'

export default defineNuxtPlugin((nuxtApp) => {
  const authStore = useAuthStore()
  setupAuthInterceptor({
    getAccessToken: () => authStore.accessToken,
    setAccessToken: (token) => authStore.setAccessToken(token),
    clearAuth: () => authStore.clearState(),
  })
  nuxtApp.hook('app:mounted', () => {
    void authStore.initAuth()
  })
})
