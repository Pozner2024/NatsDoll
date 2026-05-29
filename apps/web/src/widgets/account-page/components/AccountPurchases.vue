<template>
  <section class="account-purchases">
    <h2 class="account-purchases__title">
      Purchases
    </h2>

    <div class="account-purchases__empty">
      <svg
        class="account-purchases__empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        aria-hidden="true"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line
          x1="3"
          y1="6"
          x2="21"
          y2="6"
        />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      <p>No orders yet</p>
      <RouterLink
        to="/shop"
        class="account-purchases__link"
      >
        Browse the shop
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped lang="scss">
.account-purchases {
  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 2rem;
    color: var(--color-text);
  }

  &__empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  &__empty-icon {
    width: 48px;
    height: 48px;
    color: var(--color-border);
  }

  &__link {
    color: var(--color-accent);
    text-decoration: underline;
    font-size: 0.9rem;
  }
}
</style>
