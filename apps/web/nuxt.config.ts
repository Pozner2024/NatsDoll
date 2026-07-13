import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-06-10',
  buildId: 'natsdoll',
  modules: ['@pinia/nuxt', '@nuxt/fonts'],
  fonts: {
    families: [
      { name: 'Playfair Display', provider: 'google', weights: [400], styles: ['normal', 'italic'] },
      { name: 'Corinthia', provider: 'google', weights: [400, 700] },
    ],
  },
  runtimeConfig: {
    public: {
      siteUrl: 'https://natsdoll.com',
    },
  },
  routeRules: {
    // Публичные витрины — SWR-кэш готового HTML на 60с (отдаём мгновенно, обновляем в фоне).
    // Данные (сток/цены) могут отставать до 60с; корзина/чекаут не кэшируются (ssr:false ниже).
    '/': { swr: 60 },
    '/shop': { swr: 60 },
    '/shop/**': { swr: 60 },
    '/product/**': { swr: 60 },
    '/gallery': { swr: 60 },
    '/auth/**': { ssr: false },
    '/verify-email': { ssr: false },
    '/reset-password': { ssr: false },
    '/account/**': { ssr: false },
    '/cart': { ssr: false },
    '/orders/**': { ssr: false },
    '/admin/**': { ssr: false },
    '/checkout': { redirect: '/cart' },
  },
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
  css: ['@/assets/styles/global.scss'],
  devServer: {
    port: 5173,
    host: '0.0.0.0',
  },
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.NUXT_DEV_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  typescript: {
    tsConfig: {
      compilerOptions: {
        types: ['vitest/globals'],
        noUncheckedIndexedAccess: false,
      },
      include: ['../src/**/*', '../vitest-env.d.ts'],
    },
  },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'NatsDoll',
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/favicon-180.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      script: [
        {
          src: 'https://stats.natsdoll.com/script.js',
          defer: true,
          'data-website-id': '281c6d6a-3b0d-46a6-a21c-d9a1829100ea',
          tagPosition: 'bodyClose',
        },
      ],
    },
  },
})
