<template>
  <RouterLink v-if="to" :to="to" class="app-button" v-bind="$attrs">
    <slot />
  </RouterLink>
  <button v-else class="app-button" v-bind="$attrs">
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
@property --btn-angle {
  syntax: '<angle>';
  initial-value: 90deg;
  inherits: false;
}

.app-button {
  --btn-angle: 90deg;

  display: inline-block;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.72rem;
  color: var(--color-text);
  padding: 0.6rem 2rem;
  text-decoration: none;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  background: none;
  border: 2px solid;
  border-image: conic-gradient(
    from var(--btn-angle),
    rgb(var(--btn-gradient-dark) / 0.4),
    rgb(var(--btn-gradient-mid) / 1) 0.07turn,
    rgb(var(--btn-gradient-light) / 1) 0.12turn,
    rgb(var(--btn-gradient-mid) / 1) 0.17turn,
    rgb(var(--btn-gradient-dark) / 0.4) 0.25turn
  ) 1;
  animation: btn-border-rotate 3000ms linear infinite forwards;
  transition: background-color 0.3s ease;

  &:hover {
    background-color: rgb(var(--btn-gradient-mid) / 0.12);
  }
}

@keyframes btn-border-rotate {
  100% {
    --btn-angle: 420deg;
  }
}
</style>
