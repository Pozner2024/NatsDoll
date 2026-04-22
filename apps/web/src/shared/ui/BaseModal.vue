<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        ref="overlayRef"
        class="base-modal__overlay"
        @click.self="handleClose"
      >
        <div
          ref="modalRef"
          class="base-modal"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledBy"
          tabindex="-1"
          @keydown.tab="onTab"
        >
          <button
            class="base-modal__close"
            aria-label="Close"
            @click="handleClose"
          >
            ×
          </button>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { lockScroll, unlockScroll } from '../lib/useBodyScrollLock'

const props = defineProps<{
  isOpen: boolean
  labelledBy?: string
}>()

const emit = defineEmits<{
  close: []
  open: []
}>()

const overlayRef = ref<HTMLElement | null>(null)
const modalRef = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(): HTMLElement[] {
  if (!modalRef.value) return []
  return Array.from(modalRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    handleClose()
  }
}

function onTab(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const items = getFocusable()
  if (items.length === 0) {
    e.preventDefault()
    modalRef.value?.focus()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

watch(
  () => props.isOpen,
  (open, prev) => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null
      lockScroll()
      window.addEventListener('keydown', onKeydown)
      nextTick(() => {
        const items = getFocusable()
        ;(items[0] ?? modalRef.value)?.focus()
      })
      emit('open')
    } else if (prev) {
      unlockScroll()
      window.removeEventListener('keydown', onKeydown)
      previousFocus?.focus?.()
      previousFocus = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (props.isOpen) {
    unlockScroll()
    window.removeEventListener('keydown', onKeydown)
  }
})

function handleClose() {
  emit('close')
}
</script>

<style scoped lang="scss">
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.base-modal {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &:focus {
    outline: none;
  }

  &__overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal, 1000);
  }

  &__close {
    position: absolute;
    top: 0.75rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--color-text-muted);

    &:hover {
      color: var(--color-text);
    }
  }
}
</style>
