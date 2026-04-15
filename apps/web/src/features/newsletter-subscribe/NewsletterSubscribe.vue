<template>
  <div class="newsletter-subscribe">
    <p class="newsletter-subscribe__title">
      Stay Connected
    </p>
    <p class="newsletter-subscribe__sub">
      New pieces & discounts - straight to your inbox
    </p>
    <form
      v-if="state !== 'success'"
      class="newsletter-subscribe__form"
      novalidate
      @submit.prevent="handleSubmit"
    >
      <input
        v-model="email"
        class="newsletter-subscribe__input"
        data-testid="newsletter-email"
        type="email"
        placeholder="Your email"
        :disabled="state === 'loading'"
      >
      <button
        class="newsletter-subscribe__btn"
        data-testid="newsletter-submit"
        type="submit"
        :disabled="state === 'loading'"
        aria-label="Subscribe"
      >
        →
      </button>
    </form>
    <p
      v-if="state === 'success'"
      class="newsletter-subscribe__success"
      data-testid="newsletter-success"
    >
      You're in!
    </p>
    <p
      v-if="state === 'error'"
      class="newsletter-subscribe__error"
      data-testid="newsletter-error"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useNewsletterSubscribe } from './useNewsletterSubscribe'

const { email, state, errorMessage, handleSubmit } = useNewsletterSubscribe()
</script>

<style scoped lang="scss">
@use '@/shared/lib/animated-border' as *;

.newsletter-subscribe {
  &__title {
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text);
    margin: 0 0 0.4rem;
  }

  &__sub {
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    margin: 0 0 0.875rem;
    line-height: 1.5;
  }

  &__form {
    @include animated-border;

    display: flex;
  }

  &__input {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0.6rem 0.875rem;
    font-family: var(--font-display);
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    outline: none;
    min-width: 0;

    &::placeholder {
      opacity: 0.5;
    }
  }

  &__btn {
    border: none;
    border-left: 1px solid var(--color-border);
    background: none;
    padding: 0.6rem 1rem;
    font-size: var(--fs-base);
    color: var(--color-accent);
    display: flex;
    align-items: center;

    transition: color 0.2s ease, background-color 0.2s ease;

    &:hover {
      color: var(--color-text);
      background-color: rgb(var(--btn-gradient-mid) / 0.12);
    }

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
  }

  &__success {
    font-size: var(--fs-base);
    color: var(--color-accent);
    margin: 0;
  }

  &__error {
    font-size: var(--fs-md);
    color: var(--color-error);
    margin: 0.4rem 0 0;
  }
}
</style>
