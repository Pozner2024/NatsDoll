<template>
  <nav
    v-if="totalPages > 1"
    class="shop-pagination"
    aria-label="Pagination"
  >
    <RouterLink
      v-if="currentPage > 1"
      class="shop-pagination__prev"
      :to="linkTo(currentPage - 1)"
      aria-label="Previous page"
    >
      ‹
    </RouterLink>

    <template
      v-for="(item, idx) in items"
      :key="`${item.kind}-${idx}`"
    >
      <RouterLink
        v-if="item.kind === 'page' && item.page !== currentPage"
        class="shop-pagination__page"
        :to="linkTo(item.page)"
      >
        {{ item.page }}
      </RouterLink>
      <span
        v-else-if="item.kind === 'page'"
        class="shop-pagination__page shop-pagination__page--current"
        aria-current="page"
      >
        {{ item.page }}
      </span>
      <span
        v-else
        class="shop-pagination__page shop-pagination__page--ellipsis"
      >...</span>
    </template>

    <RouterLink
      v-if="currentPage < totalPages"
      class="shop-pagination__next"
      :to="linkTo(currentPage + 1)"
      aria-label="Next page"
    >
      ›
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const props = defineProps<{
  currentPage: number
  totalPages: number
  currentSort: string
}>()

type Item = { kind: 'page'; page: number } | { kind: 'ellipsis' }

const items = computed<Item[]>(() => buildPages(props.currentPage, props.totalPages))

function buildPages(current: number, total: number): Item[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => ({ kind: 'page', page: i + 1 }))
  }
  const shown = new Set<number>([1, total])
  for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) shown.add(i)
  if (current <= 2) { shown.add(2); shown.add(3) }
  if (current >= total - 1) { shown.add(total - 2); shown.add(total - 1) }

  const sorted = [...shown].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: Item[] = []
  let prev = 0
  for (const n of sorted) {
    if (n - prev > 1) out.push({ kind: 'ellipsis' })
    out.push({ kind: 'page', page: n })
    prev = n
  }
  return out
}

const route = useRoute()

function linkTo(page: number) {
  const query: Record<string, string> = {}
  if (props.currentSort !== 'newest') query.sort = props.currentSort
  if (page > 1) query.page = String(page)
  return { name: 'shop', params: route.params, query }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.shop-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
  margin-top: 2.5rem;
  font-size: var(--fs-sm);

  @include tablet {
    margin-top: 3rem;
  }

  &__page,
  &__prev,
  &__next {
    min-width: 2.75rem;
    height: 2.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.5rem;
    color: var(--color-text);
    text-decoration: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-white);

    @include tablet {
      min-width: 2rem;
      height: 2rem;
    }

    &:hover {
      background: rgb(var(--btn-gradient-mid) / 0.2);
    }
  }

  &__page--current {
    background: var(--color-accent);
    color: var(--color-white);
    border-color: var(--color-accent);

    &:hover {
      background: var(--color-accent);
    }
  }

  &__page--ellipsis {
    border: none;
    background: transparent;

    &:hover {
      background: transparent;
    }
  }
}
</style>
