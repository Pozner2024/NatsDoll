<template>
  <label class="sort-control">
    <span class="sort-control__label">Sort:</span>
    <select
      class="sort-control__select"
      :value="value"
      @change="onChange(($event.target as HTMLSelectElement).value)"
    >
      <option value="newest">Newest</option>
      <option value="price-asc">Price: low to high</option>
      <option value="price-desc">Price: high to low</option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import type { ProductSortOrder } from '@/entities/product'

defineProps<{ value: ProductSortOrder }>()

const router = useRouter()
const route = useRoute()

function onChange(raw: string) {
  const sort = raw as ProductSortOrder
  const query = { ...route.query, sort } as Record<string, string>
  delete query.page
  void router.replace({ name: 'shop', params: route.params, query })
}
</script>

<style scoped lang="scss">
.sort-control {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);

  &__select {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-white);
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: var(--fs-sm);
  }
}
</style>
