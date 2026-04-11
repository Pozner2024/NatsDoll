<template>
  <section class="newsletter">
    <h2 class="newsletter__title">Подписаться на рассылку</h2>
    <p class="newsletter__description">Новые работы и акции — первыми узнаете вы</p>

    <form
      v-if="state === 'idle' || state === 'loading' || state === 'error'"
      class="newsletter__form"
      @submit.prevent="handleSubmit"
    >
      <input
        v-model="email"
        class="newsletter__input"
        type="email"
        placeholder="ваш@email.com"
        :disabled="state === 'loading'"
        required
      />
      <button
        class="newsletter__button"
        type="submit"
        :disabled="state === 'loading'"
      >
        {{ state === 'loading' ? 'Отправка...' : 'Подписаться' }}
      </button>
      <p v-if="state === 'error'" class="newsletter__error">{{ errorMessage }}</p>
    </form>

    <p v-if="state === 'success'" class="newsletter__success">
      Спасибо! Вы подписаны на рассылку.
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { subscribeToNewsletter } from './newsletterSubscribeApi'

type State = 'idle' | 'loading' | 'success' | 'error'

const state = ref<State>('idle')
const email = ref('')
const errorMessage = ref('')

async function handleSubmit() {
  state.value = 'loading'
  errorMessage.value = ''
  try {
    await subscribeToNewsletter(email.value)
    state.value = 'success'
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Ошибка подписки'
    state.value = 'error'
  }
}
</script>

<style scoped lang="scss">
.newsletter {
  padding: 3rem 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;

  &__title {
    font-family: var(--font-brand);
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.1;
  }

  &__description {
    font-size: 0.9rem;
    color: var(--color-text);
    opacity: 0.7;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 400px;
  }

  &__input {
    padding: 0.75rem 1rem;
    border: 1px solid rgb(var(--color-text-rgb) / 0.2);
    border-radius: 0.25rem;
    font-size: 1rem;
    background: transparent;
    color: var(--color-text);
    width: 100%;

    &:focus {
      outline: none;
      border-color: var(--color-accent);
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  &__button {
    padding: 0.75rem 1.5rem;
    background: var(--color-accent);
    color: var(--color-bg);
    border: none;
    border-radius: 0.25rem;
    font-size: 1rem;
    font-weight: 600;
    width: 100%;

    &:disabled {
      opacity: 0.6;
    }
  }

  &__error {
    font-size: 0.85rem;
    color: #e53e3e;
  }

  &__success {
    font-size: 1rem;
    color: var(--color-accent);
    font-weight: 600;
  }
}
</style>
