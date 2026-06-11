import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-06-10',
  modules: ['@pinia/nuxt'],
  runtimeConfig: {
    public: {
      siteUrl: 'https://natsdoll.com',
    },
  },
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
  css: ['@/assets/styles/global.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
  },
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
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Corinthia:wght@400;700&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&display=swap' },
      ],
      script: [
        {
          src: 'https://stats.natsdoll.com/script.js',
          defer: true,
          'data-website-id': '26676592-6929-4621-a645-1d1590e31b78',
          tagPosition: 'bodyClose',
        },
      ],
    },
  },
})
