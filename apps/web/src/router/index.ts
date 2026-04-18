import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}
import { useAuthStore } from '@/features/auth'
import { useAuthModal } from '@/features/auth-modal'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
  },
  {
    path: '/gallery',
    name: 'gallery',
    component: () => import('@/pages/GalleryPage.vue'),
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/pages/AccountPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/pages/CartPage.vue'),
  },
  {
    path: '/auth/callback',
    name: 'auth-callback',
    component: () => import('@/pages/AuthCallbackPage.vue'),
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('@/pages/VerifyEmailPage.vue'),
  },
  {
    path: '/shop/:category?',
    name: 'shop',
    component: () => import('@/pages/ShopPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, _from, savedPosition) => {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes,
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const authStore = useAuthStore()
  if (!authStore.authReady) await authStore.initAuth()
  if (authStore.isLoggedIn) return true
  const { open } = useAuthModal()
  open()
  return { name: 'home' }
})

export default router
