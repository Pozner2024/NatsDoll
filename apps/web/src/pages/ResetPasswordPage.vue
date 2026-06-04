<template>
  <div class="reset-page">
    <h1 class="reset-page__title">
      Reset password
    </h1>

    <form
      v-if="!done && token"
      class="reset-page__form"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <div class="reset-page__field">
        <label
          class="reset-page__label"
          for="reset-password"
        >New password</label>
        <input
          id="reset-password"
          v-model="password"
          class="reset-page__input"
          type="password"
          autocomplete="new-password"
        >
      </div>

      <p
        v-if="error"
        class="reset-page__error"
      >
        {{ error }}
      </p>

      <button
        class="reset-page__submit"
        type="submit"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Saving…' : 'Set new password' }}
      </button>
    </form>

    <p
      v-else-if="done"
      class="reset-page__done"
    >
      Password updated. Redirecting…
    </p>

    <p
      v-else
      class="reset-page__error"
    >
      This reset link is invalid or has expired.
      <RouterLink to="/">
        Go home
      </RouterLink>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/entities/user'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const token = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')
const done = ref(false)

onMounted(() => {
  const t = route.query.token
  token.value = typeof t === 'string' ? t : ''
})

async function handleSubmit() {
  if (!token.value) return
  isLoading.value = true
  error.value = ''
  try {
    await authStore.resetPassword(token.value, password.value)
    done.value = true
    setTimeout(() => router.push('/'), 1200)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Reset failed.'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.reset-page {
  max-width: 420px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &__title {
    font-family: var(--font-brand);
    font-size: var(--fs-section-heading);
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
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
  }

  &__submit {
    align-self: center;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--fs-sm);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 0.6rem 2rem;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-text);
    transition: background-color 0.3s ease;

    &:hover:not(:disabled) {
      background-color: rgb(0 0 0 / 0.03);
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  &__error {
    font-size: var(--fs-sm);
    color: var(--color-error);
  }

  &__done {
    font-size: var(--fs-base);
    color: var(--color-accent);
  }
}
</style>
