import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
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
        path: 'purchases/:id',
        name: 'account-purchase-detail',
        component: () => import('@/widgets/account-page/components/AccountPurchaseDetail.vue'),
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
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/pages/ResetPasswordPage.vue'),
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
  {
    path: '/admin',
    component: () => import('@/pages/AdminPage.vue'),
    meta: { requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'admin',
        component: () => import('@/widgets/admin-panel/components/AdminDashboard.vue'),
      },
      {
        path: 'listings',
        name: 'admin-listings',
        component: () => import('@/widgets/admin-panel/components/AdminListings.vue'),
      },
      {
        path: 'messages',
        name: 'admin-messages',
        component: () => import('@/widgets/admin-panel/components/AdminMessages.vue'),
      },
      {
        path: 'orders',
        name: 'admin-orders',
        component: () => import('@/widgets/admin-panel/components/AdminOrders.vue'),
      },
      {
        path: 'listings/new',
        name: 'admin-listing-new',
        component: () => import('@/pages/AdminProductFormPage.vue'),
      },
      {
        path: 'listings/:id/edit',
        name: 'admin-listing-edit',
        component: () => import('@/pages/AdminProductFormPage.vue'),
      },
      {
        path: 'analytics',
        name: 'admin-analytics',
        component: () => import('@/widgets/admin-panel/components/AdminAnalytics.vue'),
      },
      {
        path: 'sales',
        name: 'admin-sales',
        component: () => import('@/widgets/admin-panel/components/AdminSales.vue'),
      },
      {
        path: 'finances',
        name: 'admin-finances',
        component: () => import('@/widgets/admin-panel/components/AdminFinances.vue'),
      },
    ],
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
  const needsAuth = to.meta.requiresAuth || to.meta.requiresAdmin
  if (!needsAuth) return true

  const authStore = useAuthStore()
  if (!authStore.authReady) await authStore.initAuth()

  if (!authStore.isLoggedIn) {
    if (to.meta.requiresAdmin) return { name: 'home' }
    const { open } = useAuthModal()
    open()
    return { name: 'home' }
  }

  if (to.meta.requiresAdmin && authStore.user?.role !== 'ADMIN') {
    return { name: 'home' }
  }

  if (to.path.startsWith('/account') && authStore.user?.role === 'ADMIN') {
    return { name: 'admin' }
  }

  return true
})

export default router
