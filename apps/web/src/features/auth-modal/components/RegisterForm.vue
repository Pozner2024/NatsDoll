<template>
  <form
    class="auth-modal__form"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <h2
      id="auth-modal-register-title"
      class="auth-modal__title"
    >
      Create account
    </h2>

    <div class="auth-modal__field">
      <label
        class="auth-modal__label"
        for="auth-name"
      >Name</label>
      <input
        id="auth-name"
        v-model="form.name"
        class="auth-modal__input"
        :class="{ 'auth-modal__input--error': errors.name }"
        type="text"
        autocomplete="name"
        :aria-invalid="!!errors.name || undefined"
        :aria-describedby="errors.name ? 'auth-name-error' : undefined"
      >
      <span
        v-if="errors.name"
        id="auth-name-error"
        class="auth-modal__error"
      >{{ errors.name }}</span>
    </div>

    <div class="auth-modal__field">
      <label
        class="auth-modal__label"
        for="auth-reg-email"
      >Email</label>
      <input
        id="auth-reg-email"
        v-model="form.email"
        class="auth-modal__input"
        :class="{ 'auth-modal__input--error': errors.email }"
        type="email"
        autocomplete="email"
        :aria-invalid="!!errors.email || undefined"
        :aria-describedby="errors.email ? 'auth-reg-email-error' : undefined"
      >
      <span
        v-if="errors.email"
        id="auth-reg-email-error"
        class="auth-modal__error"
      >{{ errors.email }}</span>
    </div>

    <div class="auth-modal__field">
      <label
        class="auth-modal__label"
        for="auth-reg-password"
      >Password</label>
      <div class="auth-modal__password">
        <input
          id="auth-reg-password"
          v-model="form.password"
          class="auth-modal__input auth-modal__input--password"
          :class="{ 'auth-modal__input--error': errors.password }"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          :aria-invalid="!!errors.password || undefined"
          :aria-describedby="errors.password ? 'auth-reg-password-error' : undefined"
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
        id="auth-reg-password-error"
        class="auth-modal__error"
      >{{ errors.password }}</span>
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
      {{ isLoading ? 'Creating…' : 'Create account' }}
    </button>

    <p class="auth-modal__switch">
      Already have an account?
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
import { IconEye, validateEmail } from '@/shared'

const emit = defineEmits<{
  success: []
  switch: [mode: 'login']
}>()

const authStore = useAuthStore()

const isLoading = ref(false)
const submitError = ref('')
const showPassword = ref(false)

const form = reactive({ name: '', email: '', password: '' })
const errors = reactive({ name: '', email: '', password: '' })

async function focusFirstInvalid() {
  await nextTick()
  document.querySelector<HTMLElement>('.auth-modal [aria-invalid="true"]')?.focus()
}

function validate(): boolean {
  errors.name = form.name.trim() ? '' : 'Please enter your name'
  errors.email = validateEmail(form.email)
  errors.password = !form.password
    ? 'Please enter your password'
    : form.password.length < 4
      ? 'Password must be at least 4 characters'
      : ''
  return !errors.name && !errors.email && !errors.password
}

async function handleSubmit() {
  if (!validate()) return focusFirstInvalid()
  isLoading.value = true
  submitError.value = ''
  try {
    await authStore.register({ name: form.name, email: form.email, password: form.password })
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
