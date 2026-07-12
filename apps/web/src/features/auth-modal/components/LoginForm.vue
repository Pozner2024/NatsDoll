<template>
  <form
    class="auth-modal__form"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <h2
      id="auth-modal-login-title"
      class="auth-modal__title"
    >
      Sign in
    </h2>

    <div class="auth-modal__field">
      <label
        class="auth-modal__label"
        for="auth-email"
      >Email</label>
      <input
        id="auth-email"
        v-model="form.email"
        class="auth-modal__input"
        :class="{ 'auth-modal__input--error': errors.email }"
        type="email"
        autocomplete="email"
        :aria-invalid="!!errors.email || undefined"
        :aria-describedby="errors.email ? 'auth-email-error' : undefined"
      >
      <span
        v-if="errors.email"
        id="auth-email-error"
        class="auth-modal__error"
      >{{ errors.email }}</span>
    </div>

    <div class="auth-modal__field">
      <label
        class="auth-modal__label"
        for="auth-password"
      >Password</label>
      <div class="auth-modal__password">
        <input
          id="auth-password"
          v-model="form.password"
          class="auth-modal__input auth-modal__input--password"
          :class="{ 'auth-modal__input--error': errors.password }"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          :aria-invalid="!!errors.password || undefined"
          :aria-describedby="errors.password ? 'auth-password-error' : undefined"
        >
        <button
          type="button"
          class="auth-modal__password-toggle"
          :aria-label="showPassword ? 'Hide password' : 'Show password'"
          @click="showPassword = !showPassword"
        >
          <IconEye
            :closed="!showPassword"
            class="auth-modal__password-icon"
          />
        </button>
      </div>
      <span
        v-if="errors.password"
        id="auth-password-error"
        class="auth-modal__error"
      >{{ errors.password }}</span>
    </div>

    <button
      type="button"
      class="auth-modal__switch-btn auth-modal__forgot-link"
      @click="emit('switch', 'forgot')"
    >
      Forgot password?
    </button>

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
      {{ isLoading ? 'Signing in…' : 'Sign in' }}
    </button>

    <p class="auth-modal__switch">
      No account?
      <button
        type="button"
        class="auth-modal__switch-btn"
        @click="emit('switch', 'register')"
      >
        Create one
      </button>
    </p>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, nextTick } from 'vue'
import { useAuthStore } from '@/entities/user'
import { IconEye, validateEmail } from '@/shared'

const emit = defineEmits<{
  success: []
  switch: [mode: 'register' | 'forgot']
}>()

const authStore = useAuthStore()

const isLoading = ref(false)
const submitError = ref('')
const showPassword = ref(false)

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })

async function focusFirstInvalid() {
  await nextTick()
  document.querySelector<HTMLElement>('.auth-modal [aria-invalid="true"]')?.focus()
}

function validate(): boolean {
  errors.email = validateEmail(form.email)
  errors.password = form.password ? '' : 'Please enter your password'
  return !errors.email && !errors.password
}

async function handleSubmit() {
  if (!validate()) return focusFirstInvalid()
  isLoading.value = true
  submitError.value = ''
  try {
    await authStore.login({ email: form.email, password: form.password })
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

.auth-modal {
  &__forgot-link {
    align-self: flex-end;
    font-size: var(--fs-xs);
    margin-top: -0.4rem;
  }
}
</style>
