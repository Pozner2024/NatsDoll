<template>
  <div class="admin-listings">
    <AdminTopbar
      title="Listings"
      subtitle="Products & categories"
    >
      <template #action>
        <RouterLink
          to="/admin/listings/new"
          class="admin-listings__new-btn"
        >
          + New product
        </RouterLink>
      </template>
    </AdminTopbar>

    <div class="admin-listings__filters">
      <input
        :value="filters.search"
        class="admin-listings__search"
        placeholder="Search by name…"
        @input="setFilter({ search: ($event.target as HTMLInputElement).value })"
      >
      <select
        :value="filters.categoryId"
        class="admin-listings__select"
        @change="setFilter({ categoryId: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">
          All categories
        </option>
        <option
          v-for="cat in categoryOptions"
          :key="cat.id"
          :value="cat.id"
        >
          {{ cat.name }}
        </option>
      </select>
      <select
        :value="filters.status"
        class="admin-listings__select"
        @change="setFilter({ status: ($event.target as HTMLSelectElement).value as 'all' | 'published' | 'draft' })"
      >
        <option value="all">
          All statuses
        </option>
        <option value="published">
          Published
        </option>
        <option value="draft">
          Draft
        </option>
      </select>
      <span
        v-if="data"
        class="admin-listings__count"
      >
        {{ data.total }} products
      </span>
    </div>

    <div
      v-if="error"
      class="admin-listings__error"
    >
      <span>{{ error }}</span>
      <button
        class="admin-listings__retry"
        @click="load"
      >
        Retry
      </button>
    </div>

    <div
      v-else-if="isLoading && !data"
      class="admin-listings__loading"
    >
      Loading…
    </div>

    <div
      v-else-if="data && data.items.length === 0"
      class="admin-listings__empty"
    >
      No products found
    </div>

    <div
      v-else-if="data"
      class="admin-listings__grid"
    >
      <AdminProductCard
        v-for="product in data.items"
        :key="product.id"
        :product="product"
        :categories="categoryOptions"
        @toggle-publish="togglePublish"
        @delete="deleteProduct"
        @move-category="moveCategory"
      />
    </div>

    <div
      v-if="data && data.totalPages > 1"
      class="admin-listings__pagination"
    >
      <button
        v-for="p in data.totalPages"
        :key="p"
        class="admin-listings__page"
        :class="{ 'admin-listings__page--active': p === data.page }"
        @click="setFilter({ page: p })"
      >
        {{ p }}
      </button>
    </div>

    <div class="admin-listings__categories">
      <AdminCategoriesSection />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AdminTopbar from './AdminTopbar.vue'
import AdminProductCard from './AdminProductCard.vue'
import AdminCategoriesSection from './AdminCategoriesSection.vue'
import { useAdminListings } from '../adminListingsApi'
import { useAdminCategories } from '../adminCategoriesApi'

const { data, isLoading, error, filters, setFilter, togglePublish, deleteProduct, moveCategory, load } = useAdminListings()
const { categories } = useAdminCategories()

const categoryOptions = computed(() => categories.value)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-listings {
  display: flex;
  flex-direction: column;
  flex: 1;

  &__new-btn {
    font-size: 0.75rem;
    background: var(--color-accent);
    color: var(--color-white);
    border-radius: 6px;
    padding: 7px 14px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  }

  &__filters {
    padding: 10px 16px;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;

    @include tablet {
      padding: 10px 32px;
    }
  }

  &__search,
  &__select {
    font-size: 0.78rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 5px 10px;
    background: var(--color-white);
    color: var(--color-text);
    font-family: var(--font-display);
  }

  &__search {
    width: 160px;
  }

  &__count {
    margin-left: auto;
    font-size: 0.7rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__error {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    padding: 40px;
  }

  &__retry {
    font-size: 0.8rem;
    padding: 6px 16px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-white);
    color: var(--color-text);
  }

  &__loading,
  &__empty {
    padding: 40px;
    text-align: center;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__grid {
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    @include tablet {
      padding: 20px 32px;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
  }

  &__pagination {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 4px 16px 16px;
  }

  &__page {
    font-size: 0.72rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 3px 8px;
    background: var(--color-white);
    color: var(--color-text-muted);

    &--active {
      background: var(--color-accent);
      color: var(--color-white);
      border-color: var(--color-accent);
    }
  }

  &__categories {
    padding: 0 16px 20px;

    @include tablet {
      padding: 0 32px 24px;
    }
  }
}
</style>
