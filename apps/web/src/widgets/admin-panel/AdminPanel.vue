<template>
  <div class="admin-panel">
    <AdminSidebar />
    <div class="admin-panel__main">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AdminSidebar from './components/AdminSidebar.vue'
</script>

<style scoped lang="scss">
.admin-panel {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--color-bg);
  }
}
</style>
