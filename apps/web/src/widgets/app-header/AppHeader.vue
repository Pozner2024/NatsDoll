<template>
  <header ref="headerRef" class="app-header">
    <AppLogo @click="closeMenu" />
    <button
      ref="burgerRef"
      class="app-header__burger"
      :class="{ 'app-header__burger--open': isOpen }"
      :aria-label="isOpen ? 'Close menu' : 'Open menu'"
      @click="toggleMenu"
    >
      <span class="app-header__burger-line"></span>
      <span class="app-header__burger-line"></span>
      <span class="app-header__burger-line"></span>
    </button>

    <div class="app-header__nav-wrapper">
      <BurgerMenu
        :is-open="isOpen"
        :trigger-ref="burgerRef"
        @close="closeMenu"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { BurgerMenu } from './components'
import { AppLogo } from '@/shared'

const isOpen = ref(false);
const headerRef = ref<HTMLElement | null>(null);
const burgerRef = ref<HTMLElement | null>(null);

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
}

function handleOutsideClick(event: MouseEvent) {
  if (
    isOpen.value &&
    headerRef.value &&
    !headerRef.value.contains(event.target as Node)
  ) {
    isOpen.value = false;
  }
}

onMounted(() => document.addEventListener("click", handleOutsideClick));
onUnmounted(() => document.removeEventListener("click", handleOutsideClick));
</script>

<style scoped lang="scss">
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: var(--header-height);
  padding: 0 1.25rem;
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: var(--z-header);

  $burger-line-gap: 5px;

  &__burger {
    display: flex;
    flex-direction: column;
    gap: $burger-line-gap;
    background: none;
    border: none;
    padding: 0.625rem 0.5rem;

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
      border-radius: 2px;
    }
  }

  &__burger-line {
    display: block;
    width: 22px;
    height: 2px;
    background: var(--color-text);
    border-radius: 1px;
    transform: translateZ(0);
    transition:
      transform 0.25s ease,
      opacity 0.25s ease;
    transform-origin: center;
  }

  &__burger--open &__burger-line:nth-child(1) {
    transform: translateY(7px) rotate(45deg);
  }

  &__burger--open &__burger-line:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
  }

  &__burger--open &__burger-line:nth-child(3) {
    transform: translateY(-7px) rotate(-45deg);
  }

  &__nav-wrapper {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
  }
}
</style>
