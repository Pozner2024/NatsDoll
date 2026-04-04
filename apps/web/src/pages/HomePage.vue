<template>
  <div class="home-page">
    <HeroSlider />
    <h1 class="home-page__title">Handmade polymer clay dolls</h1>
    <p class="home-page__subtitle">Unique art dolls & gifts, made with love</p>
  </div>
</template>

<script setup lang="ts">
import { HeroSlider } from '@/features/hero'
</script>

<style scoped lang="scss">
.home-page {
  &__title {
    font-family: var(--font-brand);
    font-size: clamp(3rem, 12vw, 5rem);
    color: var(--color-text);
    line-height: 1;
    margin-bottom: 0.5rem;
    text-align: center;
    padding-top: 2rem;
  }

  &__subtitle {
    font-family: var(--font-display);
    font-size: 1rem;
    color: var(--color-accent);
    font-style: italic;
    text-align: center;
    padding-bottom: 2rem;
  }
}
</style>
