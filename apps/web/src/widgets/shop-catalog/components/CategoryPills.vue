<template>
  <nav
    class="category-pills"
    aria-label="Shop categories"
  >
    <RouterLink
      class="category-pills__pill"
      :class="{ 'category-pills__pill--active': !activeSlug }"
      :to="{ name: 'shop', query: queryWithSort }"
    >
      All
    </RouterLink>
    <RouterLink
      v-for="cat in categories"
      :key="cat.id"
      class="category-pills__pill"
      :class="{ 'category-pills__pill--active': activeSlug === cat.slug }"
      :to="{ name: 'shop', params: { category: cat.slug }, query: queryWithSort }"
    >
      {{ cat.name }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Category } from '@/entities/category'

const props = defineProps<{
  categories: Category[]
  activeSlug: string | undefined
  currentSort: string
}>()

const queryWithSort = computed(() =>
  props.currentSort === 'newest' ? {} : { sort: props.currentSort },
)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.category-pills {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.25rem 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
  mask-image: linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 0, black calc(100% - 24px), transparent 100%);

  &::-webkit-scrollbar {
    display: none;
  }

  &__pill {
    flex-shrink: 0;
    padding: 0.45rem 1rem;
    background: var(--color-border);
    color: var(--color-text);
    border-radius: 999px;
    font-size: var(--fs-sm);
    text-decoration: none;
    white-space: nowrap;
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: rgb(var(--btn-gradient-mid) / 0.4);
    }

    &--active {
      background: var(--color-accent);
      color: var(--color-white);

      &:hover {
        background: var(--color-text-muted);
      }
    }
  }

  @include tablet {
    flex-wrap: wrap;
    overflow-x: visible;
    mask-image: none;
    -webkit-mask-image: none;
  }
}
</style>
