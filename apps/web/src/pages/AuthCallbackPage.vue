<template>
  <div class="auth-callback">
    <p v-if="!failed">
      Completing sign in...
    </p>
    <p v-if="failed">
      Authentication failed.
      <RouterLink to="/">
        Go home
      </RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/entities/user'
import { resolveSafeRedirect } from '@/shared'

const router = useRouter()
const authStore = useAuthStore()
const failed = ref(false)

onMounted(async () => {
  const searchParams = new URLSearchParams(window.location.search)

  if (searchParams.get('error')) {
    history.replaceState(null, '', window.location.pathname)
    sessionStorage.removeItem('auth_redirect')
    failed.value = true
    return
  }

  history.replaceState(null, '', window.location.pathname)

  await authStore.initAuth()

  if (!authStore.isLoggedIn) {
    failed.value = true
    return
  }

  const stored = sessionStorage.getItem('auth_redirect')
  sessionStorage.removeItem('auth_redirect')
  router.replace(resolveSafeRedirect(stored))
})
</script>
