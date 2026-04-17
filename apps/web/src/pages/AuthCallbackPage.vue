<template>
  <div class="auth-callback">
    <p v-if="failed">
      Authentication failed.
      <RouterLink to="/">Go home</RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth'

const router = useRouter()
const authStore = useAuthStore()
const failed = ref(false)

onMounted(async () => {
  const hash = window.location.hash
  const match = hash.match(/[#&]token=([^&]+)/)
  const token = match ? match[1] : null

  // Немедленно очистить hash из URL
  history.replaceState(null, '', window.location.pathname)

  if (!token) {
    failed.value = true
    return
  }
  await authStore.loginWithToken(token)
  if (authStore.isLoggedIn) {
    router.replace({ name: 'account' })
  } else {
    failed.value = true
  }
})
</script>
