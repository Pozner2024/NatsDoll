<template>
  <button
    type="button"
    class="heart-btn"
    :class="[
      `heart-btn--${size}`,
      `heart-btn--${variant}`,
      { 'heart-btn--active': active, 'heart-btn--busy': busy },
    ]"
    :aria-pressed="active"
    :aria-label="ariaLabel ?? (active ? 'Remove from favorites' : 'Add to favorites')"
    :disabled="busy"
    @click.stop.prevent="onClick"
  >
    <svg
      class="heart-btn__icon"
      viewBox="0 0 24 24"
      :fill="active ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="1.6"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  active: boolean
  size?: 'sm' | 'md'
  variant?: 'overlay' | 'inline'
  busy?: boolean
  ariaLabel?: string
}>(), {
  size: 'sm',
  variant: 'overlay',
  busy: false,
  ariaLabel: undefined,
})

const emit = defineEmits<{ click: [] }>()

function onClick() {
  emit('click')
}
</script>

<style scoped lang="scss">
.heart-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  border: 1.5px solid transparent;
  border-radius: 50%;
  color: rgb(0 0 0 / 0.55);
  transition: color 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

  &:active:not(:disabled) {
    transform: scale(0.92);
  }

  &--overlay {
    background: rgb(255 255 255 / 0.85);
    backdrop-filter: blur(4px);

    &:hover:not(:disabled) {
      background: rgb(255 255 255 / 0.95);
      color: var(--color-accent);
    }
  }

  &--inline {
    background: transparent;
    border-color: var(--color-border);

    &:hover:not(:disabled) {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
  }

  &--sm {
    width: 32px;
    height: 32px;
  }

  &--md {
    width: 42px;
    height: 42px;
  }

  &--active {
    color: #e53935;

    &:hover:not(:disabled) {
      color: #c62828;
    }
  }

  &--inline.heart-btn--active {
    border-color: rgb(229 57 53 / 0.4);
  }

  &--busy {
    opacity: 0.6;
  }

  &__icon {
    width: 60%;
    height: 60%;
  }
}
</style>
