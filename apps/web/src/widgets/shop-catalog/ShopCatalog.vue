<template>
  <section class="shop-catalog">
    <header class="shop-catalog__header">
      <h1 class="shop-catalog__title">
        THE SHOP
      </h1>
      <nav
        v-if="category"
        class="shop-catalog__crumb"
        aria-label="Breadcrumb"
      >
        <RouterLink
          to="/shop"
          class="shop-catalog__crumb-link"
        >
          The shop
        </RouterLink>
        <span
          class="shop-catalog__crumb-sep"
          aria-hidden="true"
        >/</span>
        <span class="shop-catalog__crumb-current">{{ activeCategoryName ?? category }}</span>
      </nav>
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
  categories, categoriesError,
  activeCategoryName,
  retry,
} = useShopCatalog()

const isFirstLoad = computed(() => isLoading.value && products.value.length === 0 && !error.value)

const showSortBar = computed(() => total.value > 0 && !error.value)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.shop-catalog {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem 4rem;

  @include tablet {
    padding: 0 2rem 5rem;
  }

  @include desktop {
    padding: 0 2.5rem 6rem;
  }

  &__header {
    width: 100%;
    padding: 1.5rem 0.25rem 0;
    margin-bottom: 1.25rem;
    text-align: right;

    @include tablet {
      padding: 2rem 0.5rem 0;
      margin-bottom: 1.5rem;
    }

    @include desktop {
      padding: 2.5rem 0.5rem 0;
      margin-bottom: 2rem;
    }
  }

  &__title {
    font-family: var(--font-brand);
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    font-weight: 700;
    line-height: 0.9;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  &__crumb {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.4rem;
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
  }

  &__crumb-link {
    color: var(--color-text-muted);
    text-decoration: none;

    &:hover {
      color: var(--color-accent-hover);
    }
  }

  &__crumb-sep {
    opacity: 0.5;
  }

  &__crumb-current {
    color: var(--color-text);
  }

  &__bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1rem 0;
    flex-wrap: wrap;
    gap: 0.5rem;

    @include tablet {
      margin: 1.25rem 0;
    }
  }

  &__total {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }
}
</style>
