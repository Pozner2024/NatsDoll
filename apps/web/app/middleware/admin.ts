import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useAuthStore } from '@/entities/user'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return

  const authStore = useAuthStore()
  if (!authStore.authReady) await authStore.initAuth()

  if (!authStore.isLoggedIn || authStore.user?.role !== 'ADMIN') {
    return navigateTo('/')
  }
})
