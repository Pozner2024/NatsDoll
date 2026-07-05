<template>
  <Teleport to="body">
    <div
      class="app-toaster"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <TransitionGroup
        name="toast"
        tag="div"
        class="app-toaster__list"
      >
        <div
          v-for="t in toast.items"
          :key="t.id"
          class="app-toaster__item"
          :class="`app-toaster__item--${t.type}`"
          role="status"
        >
          <span class="app-toaster__message">{{ t.message }}</span>
          <button
            type="button"
            class="app-toaster__close"
            aria-label="Dismiss notification"
            @click="toast.dismiss(t.id)"
          >
            ×
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '../lib/useToast'

const toast = useToast()
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.app-toaster {
  position: fixed;
  top: calc(var(--header-height) + 0.5rem);
  left: 0;
  right: 0;
  z-index: var(--z-toast);
  display: flex;
  justify-content: center;
  padding: 0 1rem;
  pointer-events: none;

  @include desktop {
    left: auto;
    right: 1rem;
    justify-content: flex-end;
    padding: 0;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 26rem;
  }

  &__item {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border-left: 4px solid var(--color-text-muted);
    background: var(--color-white);
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.15);
    color: var(--color-text);
    font-size: var(--fs-md);

    &--error {
      border-left-color: var(--color-error);
    }

    &--success {
      border-left-color: var(--color-success);
    }

    &--info {
      border-left-color: transparent;
    }
  }

  &__message {
    flex: 1;
    line-height: 1.35;
  }

  &__close {
    flex-shrink: 0;
    width: 1.5rem;
    height: 1.5rem;
    line-height: 1;
    font-size: 1.25rem;
    color: var(--color-text-muted);
    background: none;
    border: none;

    &:hover {
      color: var(--color-text);
    }
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}
</style>
