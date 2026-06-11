import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useAuthStore } from '@/entities/user'
import { useAuthModal } from '@/shared'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const authStore = useAuthStore()
  if (!authStore.authReady) await authStore.initAuth()

  if (!authStore.isLoggedIn) {
    const { open } = useAuthModal()
    open()
    return navigateTo('/')
  }

  if (to.path.startsWith('/account') && authStore.user?.role === 'ADMIN') {
    return navigateTo('/admin')
  }
})
