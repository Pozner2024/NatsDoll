<template>
  <header class="admin-topbar">
    <div class="admin-topbar__left">
      <h1 class="admin-topbar__title">
        {{ title }}
      </h1>
      <span
        v-if="subtitle"
        class="admin-topbar__subtitle"
      >{{ subtitle }}</span>
    </div>
    <div class="admin-topbar__actions">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<style scoped lang="scss">
.admin-topbar {
  height: 56px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 32px;
  background: var(--color-white);
  gap: 12px;
  flex-shrink: 0;

  &__left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: 0.01em;
  }

  &__subtitle {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;

    &::before {
      content: '·';
      margin-right: 10px;
      color: var(--color-border);
    }
  }

  &__actions {
    margin-left: auto;
    display: flex;
    gap: 10px;
    align-items: center;
  }
}
</style>
