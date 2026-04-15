<template>
  <RouterLink
    to="/"
    class="app-logo"
    aria-label="NatsDoll — Home"
  >
    NatsDoll
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped lang="scss">
.app-logo {
  font-family: var(--font-brand);
  font-weight: 700;
  font-size: var(--fs-logo);
  color: var(--color-text);
  letter-spacing: 0.06rem;
  line-height: 1;
  text-decoration: none;
}
</style>
