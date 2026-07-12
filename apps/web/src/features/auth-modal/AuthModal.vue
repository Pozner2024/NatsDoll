<template>
  <BaseModal
    :is-open="isOpen"
    :labelled-by="labelledBy"
    @close="close"
    @open="forgotSent = false"
  >
    <div class="auth-modal">
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

      <LoginForm
        v-if="mode === 'login'"
        @success="handleLoginSuccess"
        @switch="open"
      />

      <RegisterForm
        v-if="mode === 'register'"
        @success="handleRegisterSuccess"
        @switch="open"
      />

      <ForgotPasswordForm
        v-if="mode === 'forgot' && !forgotSent"
        @success="forgotSent = true"
        @switch="open"
      />

      <div
        v-if="mode === 'forgot' && forgotSent"
        class="auth-modal__verify"
      >
        <h2
          id="auth-modal-forgot-title"
          class="auth-modal__title"
        >
          Check your email
        </h2>
        <p class="auth-modal__verify-text">
          If an account exists for that email, we've sent a reset link. Please check your inbox.
        </p>
        <button
          type="button"
          class="auth-modal__switch-btn"
          @click="open('login')"
        >
          Back to sign in
        </button>
      </div>

      <template v-if="mode === 'login' || mode === 'register'">
        <div class="auth-modal__divider">
          <span>or</span>
        </div>

        <button
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
      </template>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthModal, BaseModal, resolveSafeRedirect } from '@/shared'
import LoginForm from './components/LoginForm.vue'
import RegisterForm from './components/RegisterForm.vue'
import ForgotPasswordForm from './components/ForgotPasswordForm.vue'

const authModal = useAuthModal()
const { isOpen, mode } = storeToRefs(authModal)
const { open, close, showVerifyPending } = authModal
const router = useRouter()

const forgotSent = ref(false)

const labelledBy = computed(() => {
  if (mode.value === 'login') return 'auth-modal-login-title'
  if (mode.value === 'register') return 'auth-modal-register-title'
  if (mode.value === 'forgot') return 'auth-modal-forgot-title'
  return 'auth-modal-verify-title'
})

watch(mode, () => {
  forgotSent.value = false
})

function handleLoginSuccess() {
  close()
  const stored = sessionStorage.getItem('auth_redirect')
  sessionStorage.removeItem('auth_redirect')
  if (stored) router.push(resolveSafeRedirect(stored))
}

function saveAuthRedirect() {
  if (!sessionStorage.getItem('auth_redirect')) {
    const { pathname, search, hash } = window.location
    sessionStorage.setItem('auth_redirect', pathname + search + hash)
  }
}

function handleRegisterSuccess() {
  saveAuthRedirect()
  showVerifyPending()
}

function handleGoogle() {
  saveAuthRedirect()
  window.location.href = '/api/auth/google'
}
</script>

<style scoped lang="scss">
@use './authFormStyles';

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

  &__verify {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    text-align: center;
    padding: 1rem 0;
  }
}
</style>
