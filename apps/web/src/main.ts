import '@/assets/styles/variables.scss'
import '@/assets/styles/reset.scss'
import '@/assets/styles/fonts.scss'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
