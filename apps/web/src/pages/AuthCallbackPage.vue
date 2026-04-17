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
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const failed = ref(false)

onMounted(async () => {
  const token = route.query.token
  if (typeof token !== 'string' || !token) {
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
