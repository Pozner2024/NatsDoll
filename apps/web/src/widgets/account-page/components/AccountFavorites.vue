<template>
  <section class="account-favorites">
    <h2 class="account-favorites__title">
      Favorites
    </h2>

    <p
      v-if="loading && items.length === 0"
      class="account-favorites__status"
    >
      Loading…
    </p>

    <p
      v-else-if="error"
      class="account-favorites__status account-favorites__status--error"
    >
      {{ error }}
    </p>

    <div
      v-else-if="items.length === 0"
      class="account-favorites__empty"
    >
      <svg
        class="account-favorites__empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
      <p>No favorites yet</p>
      <RouterLink
        to="/shop"
        class="account-favorites__link"
      >
        Find something you love
      </RouterLink>
    </div>

    <div
      v-else
      class="account-favorites__grid"
    >
      <ProductCard
        v-for="product in items"
        :key="product.id"
        :product="product"
      >
        <template #overlay>
          <FavoriteToggle :product="product" />
        </template>
      </ProductCard>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useFavoritesStore } from '@/entities/favorites'
import { ProductCard } from '@/entities/product'
import { FavoriteToggle } from '@/features/favorites-toggle'

const favoritesStore = useFavoritesStore()

const items = computed(() => favoritesStore.items)
const loading = computed(() => favoritesStore.loading)
const error = computed(() => favoritesStore.error)

onMounted(() => {
  void favoritesStore.load()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.account-favorites {
  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 2rem;
    color: var(--color-text);
  }

  &__status {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
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

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;

    @include phablet {
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }
  }
}
</style>
