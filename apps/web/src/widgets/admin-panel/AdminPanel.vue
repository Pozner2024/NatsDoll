<template>
  <div class="admin-panel">
    <div class="admin-panel__mobile-bar">
      <div class="admin-panel__mobile-logo">Shop Manager</div>
      <button class="admin-panel__hamburger" @click="isOpen = true" aria-label="Open menu">
        <span /><span /><span />
      </button>
    </div>

    <AdminSidebar :is-open="isOpen" @close="isOpen = false" />

    <div class="admin-panel__main">
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import AdminSidebar from './components/AdminSidebar.vue'

const isOpen = ref(false)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-panel {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--color-bg);

  @include tablet {
    flex-direction: row;
  }

  &__mobile-bar {
    height: 52px;
    background: #2c1810;
    display: flex;
    align-items: center;
    padding: 0 16px;
    flex-shrink: 0;

    @include tablet {
      display: none;
    }
  }

  &__mobile-logo {
    font-family: var(--font-brand);
    font-size: 2rem;
    color: var(--color-bg);
    line-height: 1;
    flex: 1;
  }

  &__hamburger {
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    padding: 6px;

    span {
      display: block;
      width: 22px;
      height: 2px;
      background: rgb(253 246 239 / 0.75);
      border-radius: 1px;
    }
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--color-bg);
  }
}
</style>
