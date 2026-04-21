<template>
  <div class="auth-callback">
    <p v-if="!failed && !done">Completing sign in...</p>
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
const done = ref(false)

onMounted(async () => {
  const searchParams = new URLSearchParams(window.location.search)

  if (searchParams.get('error')) {
    history.replaceState(null, '', window.location.pathname)
    sessionStorage.removeItem('auth_redirect')
    failed.value = true
    return
  }

  history.replaceState(null, '', window.location.pathname)

  await authStore.loginFromCookie()

  if (authStore.isLoggedIn) {
    const stored = sessionStorage.getItem('auth_redirect')
    sessionStorage.removeItem('auth_redirect')
    const isSafe = !!stored && stored.startsWith('/') && !stored.startsWith('//')
    router.replace(isSafe ? stored : '/')
  } else {
    failed.value = true
  }
  done.value = true
})
</script>
