<template>
  <div class="cart-page__guest-email">
    <label
      for="guest-email"
      class="cart-page__guest-email-label"
    >
      Email
      <span
        aria-hidden="true"
        class="cart-page__guest-email-required"
      >*</span>
    </label>
    <input
      id="guest-email"
      :value="modelValue"
      type="email"
      autocomplete="email"
      class="cart-page__guest-email-input"
      placeholder="your@email.com"
      @input="onInput"
    >
    <p
      v-if="error"
      class="cart-page__guest-email-error"
    >
      {{ error }}
    </p>
    <p
      v-if="emailTaken && signInLinkSent"
      class="cart-page__guest-email-taken"
    >
      We've emailed a sign-in link to {{ modelValue }}. Check your inbox to continue.
    </p>
    <p
      v-else-if="emailTaken"
      class="cart-page__guest-email-taken"
    >
      An account with this email exists —
      <button
        type="button"
        class="cart-page__sign-in-btn"
        @click="emit('open-login')"
      >
        sign in
      </button>
      or
      <button
        type="button"
        class="cart-page__sign-in-btn"
        @click="emit('send-link')"
      >
        email me a sign-in link
      </button>
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  error: string
  emailTaken: boolean
  signInLinkSent: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'open-login': []
  'send-link': []
}>()

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
</script>

<style scoped lang="scss">
.cart-page {
  &__guest-email {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__guest-email-label {
    font-size: var(--fs-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  &__guest-email-required {
    color: var(--color-error);
    margin-left: 0.2rem;
  }

  &__guest-email-input {
    width: 100%;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-family: inherit;
    font-size: var(--fs-sm);
    color: var(--color-text);
    background: var(--color-bg);
    outline: none;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__guest-email-error {
    font-size: var(--fs-sm);
    color: var(--color-error);
    margin: 0;
  }

  &__guest-email-taken {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  &__sign-in-btn {
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
