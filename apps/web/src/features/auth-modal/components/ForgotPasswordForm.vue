<template>
  <form
    class="auth-modal__form"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <h2
      id="auth-modal-forgot-title"
      class="auth-modal__title"
    >
      Reset password
    </h2>
    <p class="auth-modal__verify-text">
      Enter your email and we'll send you a link to reset your password.
    </p>

    <div class="auth-modal__field">
      <label
        class="auth-modal__label"
        for="auth-forgot-email"
      >Email</label>
      <input
        id="auth-forgot-email"
        v-model="form.email"
        class="auth-modal__input"
        :class="{ 'auth-modal__input--error': errors.email }"
        type="email"
        autocomplete="email"
        :aria-invalid="!!errors.email || undefined"
        :aria-describedby="errors.email ? 'auth-forgot-email-error' : undefined"
      >
      <span
        v-if="errors.email"
        id="auth-forgot-email-error"
        class="auth-modal__error"
      >{{ errors.email }}</span>
    </div>

    <p
      v-if="submitError"
      class="auth-modal__error auth-modal__error--global"
      role="alert"
    >
      {{ submitError }}
    </p>

    <button
      class="auth-modal__submit"
      type="submit"
      :disabled="isLoading"
    >
      {{ isLoading ? 'Sending…' : 'Send reset link' }}
    </button>

    <p class="auth-modal__switch">
      Remembered it?
      <button
        type="button"
        class="auth-modal__switch-btn"
        @click="emit('switch', 'login')"
      >
        Sign in
      </button>
    </p>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, nextTick } from 'vue'
import { useAuthStore } from '@/entities/user'
import { validateEmail } from '@/shared'

const emit = defineEmits<{
  success: []
  switch: [mode: 'login']
}>()

const authStore = useAuthStore()

const isLoading = ref(false)
const submitError = ref('')

const form = reactive({ email: '' })
const errors = reactive({ email: '' })

async function focusFirstInvalid() {
  await nextTick()
  document.querySelector<HTMLElement>('.auth-modal [aria-invalid="true"]')?.focus()
}

function validate(): boolean {
  errors.email = validateEmail(form.email)
  return !errors.email
}

async function handleSubmit() {
  if (!validate()) return focusFirstInvalid()
  isLoading.value = true
  submitError.value = ''
  try {
    await authStore.requestPasswordReset(form.email)
    emit('success')
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped lang="scss">
@use '../authFormStyles';
</style>
