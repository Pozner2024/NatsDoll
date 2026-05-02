<template>
  <section class="shop-catalog">
    <header class="shop-catalog__header">
      <h1 class="shop-catalog__title">The shop</h1>
      <p
        v-if="categoryName"
        class="shop-catalog__crumb"
      >
        <RouterLink
          to="/shop"
          class="shop-catalog__crumb-link"
        >The shop</RouterLink>
        <span class="shop-catalog__crumb-sep"> / </span>
        <span>{{ categoryName }}</span>
      </p>
    </header>

    <ShopCatalogSkeleton v-if="isFirstLoad" />

    <template v-else>
      <CategoryPills
        :categories="categories"
        :active-slug="category"
        :current-sort="sort"
      />

      <div
        v-if="showSortBar"
        class="shop-catalog__bar"
      >
        <span class="shop-catalog__total">{{ total }} items</span>
        <SortControl :value="sort" />
      </div>

      <ErrorBar
        v-if="error"
        @retry="retry"
      />

      <EmptyState v-else-if="total === 0" />

      <ProductsGrid
        v-else
        :products="products"
        :dimmed="isLoading && products.length > 0"
      />

      <ShopPagination
        v-if="totalPages > 1"
        :current-page="page"
        :total-pages="totalPages"
        :current-sort="sort"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useShopCatalog } from './useShopCatalog'
import CategoryPills from './components/CategoryPills.vue'
import SortControl from './components/SortControl.vue'
import ProductsGrid from './components/ProductsGrid.vue'
import ShopPagination from './components/ShopPagination.vue'
import EmptyState from './components/EmptyState.vue'
import ErrorBar from './components/ErrorBar.vue'
import ShopCatalogSkeleton from './components/ShopCatalogSkeleton.vue'

const {
  category, sort, page,
  products, total, totalPages,
  isLoading, error,
  categories,
  retry,
} = useShopCatalog()

const isFirstLoad = computed(() => isLoading.value && products.value.length === 0 && !error.value)

const categoryName = computed(() => {
  if (!category.value) return null
  const found = categories.value.find((c) => c.slug === category.value)
  return found?.name ?? category.value
})

const showSortBar = computed(() => total.value > 0 && !error.value)
</script>

<style scoped lang="scss">
.shop-catalog {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;

  &__header {
    margin-bottom: 1.5rem;
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--fs-section-heading);
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  &__crumb {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__crumb-link {
    color: var(--color-text-muted);
    text-decoration: none;

    &:hover {
      color: var(--color-accent);
      text-decoration: underline;
    }
  }

  &__crumb-sep {
    margin: 0 0.25rem;
  }

  &__bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1rem 0;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  &__total {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }
}
</style>
