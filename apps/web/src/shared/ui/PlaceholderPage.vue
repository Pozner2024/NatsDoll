<template>
  <div class="placeholder-page">
    <h1 class="placeholder-page__title">{{ title }}</h1>
    <p class="placeholder-page__note">Coming soon</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>

<style scoped lang="scss">
.placeholder-page {
  min-height: 100dvh;
  padding: 2rem 1.25rem;
  text-align: center;

  &__title {
    font-family: var(--font-display);
    font-size: 2rem;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  &__note {
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--color-accent);
    font-style: italic;
  }
}
</style>
