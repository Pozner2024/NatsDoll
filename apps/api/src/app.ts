// **Composition Root** (Корень композиции) — это центральный узел архитектуры приложения, где все независимые части 
// (слои) соединяются в единое целое. Здесь настраиваются глобальные правила безопасности (CORS, Secure Headers), общая  
// обработка ошибок и регистрируются все функциональные модули системы через эндпоинты API

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { Prisma } from '@prisma/client'
import { prisma } from './shared/infrastructure'
import { AppError } from './shared/errors'
import { makeGalleryRepository, makeGetHomeGallery, makeGetCollections, makeGalleryRouter } from './features/gallery'
import {
  makeNewsletterRepository,
  makeSubscribe,
  makeNewsletterRouter,
} from './features/newsletter'
import { makeContactRepository, makeSubmit, makeContactRouter } from './features/contact'
import {
  makeProductRepository,
  makeListProducts,
  makeListCategories,
  makeGetProduct,
  makeProductsRouter,
} from './features/products'
import {
  makeAuthRepository,
  makeRegister,
  makeLogin,
  makeRefreshToken,
  makeLogout,
  makeGetMe,
  makeGoogleAuth,
  makeGetGoogleProfile,
  makeAuthRouter,
  makeVerifyEmail,
  makeEmailService,
  makeUpdateProfile,
  makeRequestPasswordReset,
  makeResetPassword,
} from './features/auth'
import {
  makeCartRepository,
  makeAddToCart,
  makeGetCart,
  makeUpdateQuantity,
  makeRemoveFromCart,
  makeCartRouter,
} from './features/cart'
import {
  makeOrderRepository,
  makeCreateOrder,
  makeGetMyOrders,
  makeGetOrder,
  makeOrderRouter,
} from './features/orders'
import {
  makeFavoritesRepository,
  makeAddFavorite,
  makeRemoveFavorite,
  makeListFavorites,
  makeFavoritesRouter,
} from './features/favorites'
import {
  makeAddressRepository,
  makeGetAddresses,
  makeCreateAddress,
  makeUpdateAddress,
  makeDeleteAddress,
  makeSetDefaultAddress,
  makeAddressRouter,
} from './features/addresses'
import {
  makeReviewRepository,
  makeGetMyReviews,
  makeGetReviewableItems,
  makeCreateReview,
  makeReviewRouter,
} from './features/reviews'
import {
  makeMessageRepository,
  makeGetMyMessages,
  makeCreateMessage,
  makeMessageRouter,
} from './features/messages'
import {
  makeAdminRepository,
  makeGetDashboard,
  makeMarkAllMessagesRead,
  makeListAdminProducts,
  makeCreateProduct,
  makeUpdateProduct,
  makeDeleteProduct,
  makeTogglePublish,
  makeListCategoriesWithCount,
  makeCreateCategory,
  makeUpdateCategory,
  makeDeleteCategory,
  makeGetAdminProduct,
  makeListConversations,
  makeGetConversation,
  makeReplyToUser,
  makeMarkConversationRead,
  makeListAdminOrders,
  makeGetAdminOrder,
  makeUpdateAdminOrder,
  makeGetAnalytics,
  makeCreateSale,
  makeUpdateSale,
  makeDeleteSale,
  makeListSales,
  makeGetActiveSale,
  makeCountProductsInSale,
  makeAdminRouter,
} from './features/admin'
import { requireAuth } from './shared/middleware'

export function createApp() {
  const app = new Hono()

  const frontendOrigin = process.env.FRONTEND_URL
    ? new URL(process.env.FRONTEND_URL).origin
    : 'http://localhost:5173'

  app.use('*', secureHeaders())

  app.use('*', cors({
    origin: frontendOrigin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }))

  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: err.message }, err.statusCode)
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return c.json({ error: 'Resource already exists' }, 409)
      }
      if (err.code === 'P2025') {
        return c.json({ error: 'Resource not found' }, 404)
      }
      if (err.code === 'P2003') {
        return c.json({ error: 'Operation not allowed due to related records' }, 409)
      }
      console.error('Prisma error:', err)
      return c.json({ error: 'Database error' }, 500)
    }
    if (err instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error('Prisma error:', err)
      return c.json({ error: 'Database error' }, 500)
    }
    console.error('Unhandled error:', err)
    return c.json({ error: 'Internal server error' }, 500)
  })

  app.get('/health', async (c) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return c.json({ status: 'ok' })
    } catch {
      return c.json({ status: 'error', error: 'database unavailable' }, 503)
    }
  })

  // Shared services
  const emailService = makeEmailService()

  // Gallery
  const galleryRepo = makeGalleryRepository(prisma)
  const getHomeGallery = makeGetHomeGallery(galleryRepo)
  const getCollections = makeGetCollections(galleryRepo)
  app.route('/gallery', makeGalleryRouter(getHomeGallery, getCollections))

  // Newsletter
  const newsletterRepo = makeNewsletterRepository(prisma)
  const subscribe = makeSubscribe(newsletterRepo)
  app.route('/newsletter', makeNewsletterRouter(subscribe))

  // Contact
  const contactRepo = makeContactRepository(prisma)
  const submit = makeSubmit(contactRepo, emailService)
  app.route('/contact', makeContactRouter(submit))

  // Admin repo and sale lookup — created early so Products can use getActiveSale
  const adminRepo = makeAdminRepository(prisma)
  const getActiveSale = makeGetActiveSale(adminRepo)

  // Products — getActiveSale injected to enrich responses with sale prices
  const productRepo = makeProductRepository(prisma)
  const listProducts = makeListProducts(productRepo, getActiveSale)
  const listCategories = makeListCategories(productRepo)
  const getProduct = makeGetProduct(productRepo, getActiveSale)
  app.route('/', makeProductsRouter(listProducts, listCategories, getProduct))

  // Auth
  const authRepo = makeAuthRepository(prisma)
  const register = makeRegister(authRepo, emailService)
  const login = makeLogin(authRepo)
  const refreshToken = makeRefreshToken(authRepo)
  const logout = makeLogout(authRepo)
  const getMe = makeGetMe(authRepo)
  const getGoogleProfile = makeGetGoogleProfile()
  const googleAuth = makeGoogleAuth(authRepo, getGoogleProfile)
  const verifyEmail = makeVerifyEmail(authRepo)
  const updateProfile = makeUpdateProfile(authRepo)
  const requestPasswordReset = makeRequestPasswordReset(authRepo, emailService)
  const resetPassword = makeResetPassword(authRepo)
  app.route('/auth', makeAuthRouter(register, login, refreshToken, logout, getMe, googleAuth, verifyEmail, updateProfile, requestPasswordReset, resetPassword))

  // Cart
  const cartRepo = makeCartRepository(prisma)
  const addToCart = makeAddToCart(cartRepo, getActiveSale)
  const getCart = makeGetCart(cartRepo, getActiveSale)
  const updateQuantity = makeUpdateQuantity(cartRepo, getActiveSale)
  const removeFromCart = makeRemoveFromCart(cartRepo)
  app.use('/cart/*', requireAuth)
  app.route('/cart', makeCartRouter(addToCart, getCart, updateQuantity, removeFromCart))

  // Orders
  const orderRepo = makeOrderRepository(prisma)
  const createOrder = makeCreateOrder(orderRepo)
  const getMyOrders = makeGetMyOrders(orderRepo)
  const getOrder = makeGetOrder(orderRepo)
  app.use('/orders', requireAuth)
  app.use('/orders/*', requireAuth)
  app.route('/', makeOrderRouter(createOrder, getMyOrders, getOrder))

  // Favorites
  const favoritesRepo = makeFavoritesRepository(prisma)
  const addFavorite = makeAddFavorite(favoritesRepo)
  const removeFavorite = makeRemoveFavorite(favoritesRepo)
  const listFavorites = makeListFavorites(favoritesRepo)
  app.use('/favorites', requireAuth)
  app.use('/favorites/*', requireAuth)
  app.route('/favorites', makeFavoritesRouter(addFavorite, removeFavorite, listFavorites))

  // Addresses
  const addressRepo = makeAddressRepository(prisma)
  const getAddresses = makeGetAddresses(addressRepo)
  const createAddress = makeCreateAddress(addressRepo)
  const updateAddress = makeUpdateAddress(addressRepo)
  const deleteAddress = makeDeleteAddress(addressRepo)
  const setDefaultAddress = makeSetDefaultAddress(addressRepo)
  app.use('/me/addresses', requireAuth)
  app.use('/me/addresses/*', requireAuth)
  app.route('/me/addresses', makeAddressRouter(getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress))

  // Reviews
  const reviewRepo = makeReviewRepository(prisma)
  const getMyReviews = makeGetMyReviews(reviewRepo)
  const getReviewableItems = makeGetReviewableItems(reviewRepo)
  const createReview = makeCreateReview(reviewRepo)
  app.use('/me/reviews', requireAuth)
  app.use('/me/reviews/*', requireAuth)
  app.route('/me/reviews', makeReviewRouter(getMyReviews, getReviewableItems, createReview))

  // Messages
  const messageRepo = makeMessageRepository(prisma)
  const getMyMessages = makeGetMyMessages(messageRepo)
  const createMessage = makeCreateMessage(messageRepo, emailService)
  app.use('/me/messages', requireAuth)
  app.use('/me/messages/*', requireAuth)
  app.route('/me/messages', makeMessageRouter(getMyMessages, createMessage))

  // Admin
  const getDashboard = makeGetDashboard(adminRepo)
  const markAllMessagesRead = makeMarkAllMessagesRead(adminRepo)
  const listAdminProducts = makeListAdminProducts(adminRepo)
  const createProduct = makeCreateProduct(adminRepo)
  const updateProduct = makeUpdateProduct(adminRepo)
  const deleteProduct = makeDeleteProduct(adminRepo)
  const togglePublish = makeTogglePublish(adminRepo)
  const listCategoriesWithCount = makeListCategoriesWithCount(adminRepo)
  const createCategory = makeCreateCategory(adminRepo)
  const updateCategory = makeUpdateCategory(adminRepo)
  const deleteCategory = makeDeleteCategory(adminRepo)
  const getAdminProduct = makeGetAdminProduct(adminRepo)
  const listConversations = makeListConversations(adminRepo)
  const getConversation = makeGetConversation(adminRepo)
  const replyToUser = makeReplyToUser(adminRepo)
  const markConversationRead = makeMarkConversationRead(adminRepo)
  const listAdminOrders = makeListAdminOrders(adminRepo)
  const getAdminOrder = makeGetAdminOrder(adminRepo)
  const updateAdminOrder = makeUpdateAdminOrder(adminRepo, emailService)
  const getAnalytics = makeGetAnalytics(adminRepo)
  const createSale = makeCreateSale(adminRepo)
  const updateSale = makeUpdateSale(adminRepo)
  const deleteSale = makeDeleteSale(adminRepo)
  const listSales = makeListSales(adminRepo)
  const countProductsInSale = makeCountProductsInSale(adminRepo)
  app.use('/admin/*', requireAuth)
  app.route('/admin', makeAdminRouter(
    getDashboard, markAllMessagesRead,
    listAdminProducts, createProduct, updateProduct, deleteProduct, togglePublish,
    listCategoriesWithCount, createCategory, updateCategory, deleteCategory,
    getAdminProduct,
    listConversations, getConversation, replyToUser, markConversationRead,
    listAdminOrders, getAdminOrder, updateAdminOrder,
    getAnalytics,
    createSale, updateSale, deleteSale, listSales, getActiveSale, countProductsInSale,
  ))

  return app
}
