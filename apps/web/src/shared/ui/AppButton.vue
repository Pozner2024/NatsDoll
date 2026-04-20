<template>
  <RouterLink
    v-if="to"
    :to="to"
    class="app-button"
    v-bind="$attrs"
  >
    <slot />
  </RouterLink>
  <button
    v-else
    class="app-button"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'

defineOptions({ inheritAttrs: false })

defineProps<{
  to?: RouteLocationRaw
}>()
</script>

<style scoped lang="scss">
@use '@/shared/lib/animated-border' as *;

.app-button {
  @include animated-border;

  display: inline-block;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--fs-md);
  color: var(--color-text);
  padding: 0.6rem 2rem;
  text-decoration: none;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: none;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: rgb(var(--btn-gradient-mid) / 0.12);
  }
}
</style>
