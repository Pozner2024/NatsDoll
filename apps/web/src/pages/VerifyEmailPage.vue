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
import { useAuthStore } from '@/entities/user'
import { apiFetch, apiErrorMessage } from '@/shared'
import { z } from 'zod'

const router = useRouter()
const authStore = useAuthStore()
const failed = ref(false)

const verifyResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.enum(['CUSTOMER', 'ADMIN']),
  }),
})

onMounted(async () => {
  const token = new URLSearchParams(window.location.search).get('token')
  if (!token) {
    failed.value = true
    return
  }

  try {
    const res = await apiFetch('/auth/verify-email', { method: 'POST', json: { token } })
    if (!res.ok) {
      console.error(await apiErrorMessage(res, 'Verification failed'))
      failed.value = true
      return
    }
    const body = verifyResponseSchema.parse(await res.json())
    await authStore.loginWithToken(body.accessToken)
    router.replace('/')
  } catch {
    failed.value = true
  }
})
</script>
