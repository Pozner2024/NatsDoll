<template>
  <div
    class="shop-skeleton"
    aria-hidden="true"
  >
    <div class="shop-skeleton__pills">
      <div
        v-for="i in 5"
        :key="i"
        class="shop-skeleton__pill"
      />
    </div>
    <div class="shop-skeleton__grid">
      <div
        v-for="i in 8"
        :key="i"
        class="shop-skeleton__card"
      />
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.shop-skeleton {
  &__pills {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  &__pill {
    width: 5rem;
    height: 2rem;
    border-radius: 999px;
    background: var(--color-border);
    animation: pulse 1.5s ease-in-out infinite;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;

    @include tablet { grid-template-columns: repeat(3, 1fr); }
    @include desktop { grid-template-columns: repeat(4, 1fr); }
  }

  &__card {
    aspect-ratio: 0.8;
    border-radius: 8px;
    background: var(--color-border);
    animation: pulse 1.5s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
