<template>
  <div class="admin-section">
    <AdminTopbar title="Listings" subtitle="Products & categories" />
    <div class="admin-section__placeholder">Coming soon</div>
  </div>
</template>

<script setup lang="ts">
import AdminTopbar from './AdminTopbar.vue'
</script>

<style scoped lang="scss">
.admin-section {
  display: flex;
  flex-direction: column;
  flex: 1;

  &__placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--color-text-muted);
    font-style: italic;
  }
}
</style>
