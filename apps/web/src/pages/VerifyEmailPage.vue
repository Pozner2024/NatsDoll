<template>
  <div class="verify-email">
    <p v-if="!failed">
      Verifying your email...
    </p>
    <p v-if="failed">
      The link is invalid or has expired.
      <RouterLink to="/">
        Go home
      </RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { resolveSafeRedirect } from '@/shared'
import { useAuthStore } from '@/entities/user'

const router = useRouter()
const authStore = useAuthStore()
const failed = ref(false)

onMounted(async () => {
  const token = new URLSearchParams(window.location.search).get('token')
  history.replaceState(null, '', window.location.pathname)
  if (!token) {
    failed.value = true
    return
  }

  try {
    await authStore.verifyEmail(token)
    const redirect = sessionStorage.getItem('auth_redirect')
    sessionStorage.removeItem('auth_redirect')
    router.replace(resolveSafeRedirect(redirect))
  } catch {
    failed.value = true
  }
})
</script>
