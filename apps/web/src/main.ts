import '@/assets/styles/global.scss'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setupAuthInterceptor } from '@/shared'
import { useAuthStore } from '@/features/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const authStore = useAuthStore()
setupAuthInterceptor({
  getAccessToken: () => authStore.accessToken,
  setAccessToken: (token) => authStore.setAccessToken(token),
  clearAuth: () => authStore.logout(),
})

app.mount('#app')
