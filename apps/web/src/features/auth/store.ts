import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from './types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = computed(() => user.value !== null)

  async function login(data: { email: string; password: string }) {
    // TODO: заменить на API-запрос — получить { id, name, email } из ответа сервера
    user.value = { id: '1', name: data.email.split('@')[0], email: data.email }
  }

  async function register(data: { name: string; email: string; password: string }) {
    // TODO: заменить на API-запрос — получить { id, name, email } из ответа сервера
    user.value = { id: '1', name: data.name, email: data.email }
  }

  function logout() {
    user.value = null
  }

  return { user, isLoggedIn, login, register, logout }
})
