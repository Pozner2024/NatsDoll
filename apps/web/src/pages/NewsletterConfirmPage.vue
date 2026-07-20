<template>
  <div class="newsletter-confirm">
    <template v-if="state === 'ready' || state === 'loading'">
      <p class="newsletter-confirm__text">
        Confirm your subscription to the NatsDoll newsletter?
      </p>
      <AppButton
        type="button"
        :disabled="state === 'loading'"
        @click="confirm"
      >
        {{ state === 'loading' ? 'Confirming…' : 'Confirm subscription' }}
      </AppButton>
    </template>
    <p
      v-if="state === 'done'"
      class="newsletter-confirm__text"
      role="status"
    >
      Your subscription is confirmed. Welcome!
    </p>
    <p
      v-if="state === 'invalid'"
      class="newsletter-confirm__text"
    >
      The link is invalid.
      <RouterLink to="/">
        Go home
      </RouterLink>
    </p>
    <p
      v-if="state === 'error'"
      class="newsletter-confirm__text"
      role="alert"
    >
      Something went wrong. Please try again.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { AppButton, apiFetch } from '@/shared'

type State = 'init' | 'ready' | 'loading' | 'done' | 'invalid' | 'error'

const state = ref<State>('init')
const email = ref('')
const token = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  email.value = params.get('email') ?? ''
  token.value = params.get('token') ?? ''
  state.value = email.value && token.value ? 'ready' : 'invalid'
})

async function confirm() {
  state.value = 'loading'
  try {
    const res = await apiFetch('/newsletter/confirm', {
      method: 'POST',
      json: { email: email.value, token: token.value },
    })
    if (res.ok) state.value = 'done'
    else state.value = res.status === 400 ? 'invalid' : 'error'
  } catch {
    state.value = 'error'
  }
}
</script>

<style scoped lang="scss">
.newsletter-confirm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 4rem 1.5rem;
  text-align: center;

  &__text {
    font-size: var(--fs-base);
    color: var(--color-text);
    margin: 0;
  }
}
</style>
