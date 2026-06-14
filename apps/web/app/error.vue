<template>
  <NuxtLayout>
    <div class="error-page">
      <p class="error-page__accent">
        Oops!
      </p>
      <h1 class="error-page__code">
        {{ error.statusCode }}
      </h1>
      <p class="error-page__message">
        {{ message }}
      </p>
      <div class="error-page__actions">
        <AppButton @click="goHome">
          Back to home
        </AppButton>
        <AppButton
          v-if="is404"
          @click="goShop"
        >
          Visit the shop
        </AppButton>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { clearError, useSeoMeta, useRequestEvent, setResponseStatus } from 'nuxt/app'
import type { NuxtError } from 'nuxt/app'
import { AppButton } from '@/shared'

const props = defineProps<{ error: NuxtError }>()

if (import.meta.server) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, props.error.statusCode)
}

const is404 = computed(() => props.error.statusCode === 404)
const message = computed(() =>
  is404.value
    ? 'This page seems to have wandered off. Perhaps it found a new home, just like our dolls do.'
    : 'Something went wrong on our side. Please try again in a moment.',
)

useSeoMeta({
  title: computed(() => (is404.value ? 'Page not found — NatsDoll' : 'Error — NatsDoll')),
  robots: 'noindex',
})

function goHome() {
  void clearError({ redirect: '/' })
}

function goShop() {
  void clearError({ redirect: '/shop' })
}
</script>

<style scoped lang="scss">
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100dvh - var(--header-height));
  padding: 2rem 1rem 4rem;
  text-align: center;
}

.error-page__accent {
  font-family: var(--font-brand);
  font-size: var(--fs-logo);
  color: var(--color-accent);
  line-height: 1;
}

.error-page__code {
  font-family: var(--font-display);
  font-size: clamp(4rem, 18vw, 7rem);
  font-weight: 400;
  color: var(--color-text);
  line-height: 1.1;
  margin: 0.25rem 0 0.5rem;
}

.error-page__message {
  font-family: var(--font-display);
  font-size: var(--fs-base);
  color: var(--color-text-muted);
  max-width: 26rem;
  margin-bottom: 2rem;
}

.error-page__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
}
</style>
