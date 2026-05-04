<template>
  <section class="shop-catalog">
    <header class="shop-catalog__header">
      <h1 class="shop-catalog__title">
        THE SHOP
      </h1>
    </header>

    <ShopCatalogSkeleton v-if="isFirstLoad" />

    <template v-else>
      <ErrorBar
        v-if="categoriesError"
        message="Couldn't load categories."
        @retry="retry"
      />

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
  categories, categoriesError,
  retry,
} = useShopCatalog()

const isFirstLoad = computed(() => isLoading.value && products.value.length === 0 && !error.value)

const showSortBar = computed(() => total.value > 0 && !error.value)
</script>

<style scoped lang="scss">
.shop-catalog {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem 4rem;

  &__header {
    width: 100%;
    padding: 28px 20px 0;
    margin-bottom: 1.5rem;
    text-align: right;
  }

  &__title {
    font-family: var(--font-brand);
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-weight: 700;
    line-height: 0.9;
    color: var(--color-text);
    margin-bottom: 0.5rem;
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
