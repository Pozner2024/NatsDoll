<template>
  <div class="empty-state">
    <p class="empty-state__text">
      No items here yet — check back soon
    </p>
    <RouterLink
      class="empty-state__btn"
      :to="{ name: 'shop' }"
    >
      Back to shop
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 3rem 1rem;
  text-align: center;

  &__text {
    font-size: var(--fs-base);
    color: var(--color-text-muted);
  }

  &__btn {
    padding: 0.6rem 1.5rem;
    background: var(--color-accent);
    color: var(--color-white);
    text-decoration: none;
    border-radius: 4px;
    font-size: var(--fs-sm);
    text-transform: uppercase;
    letter-spacing: 0.08em;

    &:hover {
      background: var(--color-text-muted);
    }
  }
}
</style>
