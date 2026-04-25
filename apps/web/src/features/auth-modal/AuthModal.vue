<template>
  <BaseModal
    :is-open="isOpen"
    :labelled-by="labelledBy"
    @close="close"
    @open="resetForms"
  >
    <div class="auth-modal">
      <button
        v-if="mode !== 'verify-pending'"
        class="auth-modal__google"
        type="button"
        @click="handleGoogle"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>

      <div
        v-if="mode !== 'verify-pending'"
        class="auth-modal__divider"
      >
        <span>or</span>
      </div>

      <div
        v-if="mode === 'verify-pending'"
        class="auth-modal__verify"
      >
        <h2
          id="auth-modal-verify-title"
          class="auth-modal__title"
        >
          Check your email
        </h2>
        <p class="auth-modal__verify-text">
          We've sent a confirmation link to your email address. Please check your inbox and click the link to activate your account.
        </p>
        <button
          type="button"
          class="auth-modal__switch-btn"
          @click="open('login')"
        >
          Back to sign in
        </button>
      </div>

      <form
        v-if="mode === 'login'"
        class="auth-modal__form"
        novalidate
        @submit.prevent="handleLogin"
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
            v-model="loginForm.email"
            class="auth-modal__input"
            :class="{ 'auth-modal__input--error': loginErrors.email }"
            type="email"
            autocomplete="email"
          >
          <span
            v-if="loginErrors.email"
            class="auth-modal__error"
          >{{ loginErrors.email }}</span>
        </div>

        <div class="auth-modal__field">
          <label
            class="auth-modal__label"
            for="auth-password"
          >Password</label>
          <input
            id="auth-password"
            v-model="loginForm.password"
            class="auth-modal__input"
            :class="{ 'auth-modal__input--error': loginErrors.password }"
            type="password"
            autocomplete="current-password"
          >
          <span
            v-if="loginErrors.password"
            class="auth-modal__error"
          >{{ loginErrors.password }}</span>
        </div>

        <p
          v-if="submitError"
          class="auth-modal__error auth-modal__error--global"
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
            @click="open('register')"
          >
            Create one
          </button>
        </p>
      </form>

      <form
        v-if="mode === 'register'"
        class="auth-modal__form"
        novalidate
        @submit.prevent="handleRegister"
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
            v-model="registerForm.name"
            class="auth-modal__input"
            :class="{ 'auth-modal__input--error': registerErrors.name }"
            type="text"
            autocomplete="name"
          >
          <span
            v-if="registerErrors.name"
            class="auth-modal__error"
          >{{ registerErrors.name }}</span>
        </div>

        <div class="auth-modal__field">
          <label
            class="auth-modal__label"
            for="auth-reg-email"
          >Email</label>
          <input
            id="auth-reg-email"
            v-model="registerForm.email"
            class="auth-modal__input"
            :class="{ 'auth-modal__input--error': registerErrors.email }"
            type="email"
            autocomplete="email"
          >
          <span
            v-if="registerErrors.email"
            class="auth-modal__error"
          >{{ registerErrors.email }}</span>
        </div>

        <div class="auth-modal__field">
          <label
            class="auth-modal__label"
            for="auth-reg-password"
          >Password</label>
          <input
            id="auth-reg-password"
            v-model="registerForm.password"
            class="auth-modal__input"
            :class="{ 'auth-modal__input--error': registerErrors.password }"
            type="password"
            autocomplete="new-password"
          >
          <span
            v-if="registerErrors.password"
            class="auth-modal__error"
          >{{ registerErrors.password }}</span>
        </div>

        <p
          v-if="submitError"
          class="auth-modal__error auth-modal__error--global"
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
            @click="open('login')"
          >
            Sign in
          </button>
        </p>
      </form>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthModal } from './useAuthModal'
import { useAuthStore } from '@/entities/user'
import { BaseModal, validateEmail } from '@/shared'

const authModal = useAuthModal()
const { isOpen, mode } = storeToRefs(authModal)
const { open, close, showVerifyPending } = authModal
const authStore = useAuthStore()
const router = useRouter()

const isLoading = ref(false)
const submitError = ref('')

const loginForm = reactive({ email: '', password: '' })
const loginErrors = reactive({ email: '', password: '' })

const registerForm = reactive({ name: '', email: '', password: '' })
const registerErrors = reactive({ name: '', email: '', password: '' })

const labelledBy = computed(() => {
  if (mode.value === 'login') return 'auth-modal-login-title'
  if (mode.value === 'register') return 'auth-modal-register-title'
  return 'auth-modal-verify-title'
})

watch(mode, () => {
  resetForms()
})

function resetForms() {
  loginForm.email = ''
  loginForm.password = ''
  loginErrors.email = ''
  loginErrors.password = ''
  registerForm.name = ''
  registerForm.email = ''
  registerForm.password = ''
  registerErrors.name = ''
  registerErrors.email = ''
  registerErrors.password = ''
  submitError.value = ''
  isLoading.value = false
}

function validateLogin(): boolean {
  loginErrors.email = validateEmail(loginForm.email)
  loginErrors.password = loginForm.password ? '' : 'Password is required'
  return !loginErrors.email && !loginErrors.password
}

function validateRegister(): boolean {
  registerErrors.name = registerForm.name.trim() ? '' : 'Name is required'
  registerErrors.email = validateEmail(registerForm.email)
  registerErrors.password = !registerForm.password
    ? 'Password is required'
    : registerForm.password.length < 8
      ? 'Password must be at least 8 characters'
      : ''
  return !registerErrors.name && !registerErrors.email && !registerErrors.password
}

async function handleLogin() {
  if (!validateLogin()) return
  isLoading.value = true
  submitError.value = ''
  try {
    await authStore.login({ email: loginForm.email, password: loginForm.password })
    close()
    router.push({ name: 'account' })
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
  } finally {
    isLoading.value = false
  }
}

async function handleRegister() {
  if (!validateRegister()) return
  isLoading.value = true
  submitError.value = ''
  try {
    await authStore.register({ name: registerForm.name, email: registerForm.email, password: registerForm.password })
    showVerifyPending()
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
  } finally {
    isLoading.value = false
  }
}

function handleGoogle() {
  sessionStorage.setItem('auth_redirect', window.location.pathname)
  window.location.href = '/api/auth/google'
}
</script>

<style scoped lang="scss">
@use '@/shared/lib/animated-border' as *;

.auth-modal {
  padding: 3rem 1.5rem 2rem;
  width: min(90vw, 420px);
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__google {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.6rem 1rem;
    border: 1px solid var(--color-border);
    background: var(--color-white);
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    letter-spacing: 0.04em;
    color: var(--color-text);
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgb(0 0 0 / 0.03);
    }
  }

  &__divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--color-text-muted);
    font-size: var(--fs-xs);

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-border);
    }
  }

  &__title {
    font-family: var(--font-brand);
    font-size: var(--fs-section-heading);
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.25rem;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  &__label {
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text);
  }

  &__input {
    border: 1px solid var(--color-border);
    padding: 0.6rem 0.75rem;
    font-size: var(--fs-base);
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-white);
    width: 100%;

    &:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: -1px;
    }

    &--error {
      border-color: var(--color-error);
    }
  }

  &__error {
    font-size: var(--fs-xs);
    color: var(--color-error);

    &--global {
      text-align: center;
    }
  }

  &__submit {
    @include animated-border;

    align-self: center;
    display: inline-block;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--fs-sm);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 0.6rem 2rem;
    background: none;
    color: var(--color-text);
    transition: background-color 0.3s ease;

    &:hover:not(:disabled) {
      background-color: rgb(var(--btn-gradient-mid) / 0.12);
    }

    &:disabled {
      opacity: 0.5;
      animation: none;
    }
  }

  &__switch {
    text-align: center;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  &__verify {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    text-align: center;
    padding: 1rem 0;
  }

  &__verify-text {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.6;
    margin: 0;
  }

  &__switch-btn {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    color: var(--color-accent);
    text-decoration: underline;
  }
}
</style>
