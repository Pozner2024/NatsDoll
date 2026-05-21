import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}
import { useAuthStore } from '@/entities/user'
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
    component: () => import('@/pages/AccountPage.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'account',
        component: () => import('@/widgets/account-page/components/AccountDashboard.vue'),
      },
      {
        path: 'profile',
        name: 'account-profile',
        component: () => import('@/widgets/account-page/components/AccountProfile.vue'),
      },
      {
        path: 'purchases',
        name: 'account-purchases',
        component: () => import('@/widgets/account-page/components/AccountPurchases.vue'),
      },
      {
        path: 'favorites',
        name: 'account-favorites',
        component: () => import('@/widgets/account-page/components/AccountFavorites.vue'),
      },
      {
        path: 'addresses',
        name: 'account-addresses',
        component: () => import('@/widgets/account-page/components/AccountAddresses.vue'),
      },
      {
        path: 'reviews',
        name: 'account-reviews',
        component: () => import('@/widgets/account-page/components/AccountReviews.vue'),
      },
      {
        path: 'messages',
        name: 'account-messages',
        component: () => import('@/widgets/account-page/components/AccountMessages.vue'),
      },
    ],
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/pages/CartPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('@/pages/CheckoutPage.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/orders/:id',
    name: 'order-confirmation',
    component: () => import('@/pages/OrderConfirmationPage.vue'),
    meta: { requiresAuth: true },
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
  {
    path: '/product/:slug',
    name: 'product',
    component: () => import('@/pages/ProductPage.vue'),
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
