<template>
  <div class="review-card">
    <div class="review-card__stars">
      <span
        v-for="i in 5"
        :key="i"
        class="review-card__star"
        :class="{ 'review-card__star--filled': i <= rating }"
      >★</span>
    </div>
    <p class="review-card__text">{{ text }}</p>
    <div class="review-card__footer">
      <div class="review-card__author">
        <span class="review-card__name">{{ name }}</span>
        <span class="review-card__country">{{ country }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  text: string
  name: string
  country: string
  rating: number
}>()
</script>

<style scoped lang="scss">

.review-card {
  background: var(--color-bg);
  border-radius: 16px;
  padding: 1.5rem 1.4rem;

  &__stars {
    text-align: center;
    margin-bottom: 0.8rem;
  }

  &__star {
    font-size: 1.2rem;
    color: rgb(44 44 44 / 0.15);

    &--filled {
      background: linear-gradient(
        90deg,
        #c9940e 20%,
        #e8c050 42%,
        #f5dfa0 50%,
        #e8c050 58%,
        #c9940e 80%
      );
      background-size: 250% 100%;
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      animation: star-shimmer 3.5s linear infinite;
    }
  }

  @keyframes star-shimmer {
    0%   { background-position: 150% center; }
    100% { background-position: -50% center; }
  }

  &__text {
    font-size: 0.85rem;
    text-align: justify;
    line-height: 1.6;
    margin-bottom: 1rem;
    color: var(--color-text);
  }

  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  &__counter {
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  &__author {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.1rem;
  }

  &__name {
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  &__country {
    font-size: 0.72rem;
    color: var(--color-gold);
  }
}
</style>
