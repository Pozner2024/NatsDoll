<template>
  <section class="artist-section">
    <div class="artist-section__header">
      <img
        class="artist-section__photo"
        :src="artistPhoto"
        :alt="artist.name"
      />
      <div class="artist-section__title">
        <span class="artist-section__tag">The artist</span>
        <h2 class="artist-section__name">{{ artist.name }}</h2>
      </div>
    </div>

    <p class="artist-section__bio">{{ artist.bio }}</p>

    <AppButton class="artist-section__btn" to="/contact">Contact</AppButton>
  </section>
</template>

<script setup lang="ts">
import { AppButton } from '@/shared'
import artistPhoto from '@/assets/images/artist.jpg'
import { artist } from './artist'
</script>

<style scoped lang="scss">
.artist-section {
  width: 100%;
  padding: 2.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  &__header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__photo {
    width: 104px;
    height: 104px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  &__title {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__tag {
    font-family: var(--font-display);
    font-size: 0.65rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--color-accent);
    opacity: 0.75;
  }

  &__name {
    font-family: var(--font-brand);
    font-size: 2.2rem;
    font-weight: 700;
    line-height: 1.15;
    color: var(--color-text);
  }

  &__bio {
    font-size: 0.9rem;
    line-height: 1.7;
    color: var(--color-text-muted);
    text-align: justify;
  }

  &__btn {
    width: 180px;
    text-align: center;
    align-self: center;
  }
}
</style>
