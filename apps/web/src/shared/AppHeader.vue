<template>
  <header ref="headerRef" class="app-header">
    <RouterLink
      to="/"
      class="app-header__logo corinthia-bold"
      aria-label="NatsDoll — Home"
    >
      NatsDoll
    </RouterLink>
    <button
      ref="burgerRef"
      class="app-header__burger"
      :class="{ 'app-header__burger--open': isOpen }"
      :aria-label="isOpen ? 'Close menu' : 'Open menu'"
      @click="isOpen = !isOpen"
    >
      <span class="app-header__burger-line"></span>
      <span class="app-header__burger-line"></span>
      <span class="app-header__burger-line"></span>
    </button>

    <div class="app-header__nav-wrapper">
      <BurgerMenu
        :is-open="isOpen"
        :trigger-ref="burgerRef"
        @close="isOpen = false"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { RouterLink } from "vue-router";
import { BurgerMenu } from "@/features/navigation";

const isOpen = ref(false);
const headerRef = ref<HTMLElement | null>(null);
const burgerRef = ref<HTMLElement | null>(null);

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
  padding: 16px 20px;
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  position: relative;
  z-index: var(--z-header);

  &__logo {
    font-size: 32px;
    color: var(--color-text);
    letter-spacing: 1px;
    line-height: 1;
    text-decoration: none;
  }

  &__burger {
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    padding: 10px 8px;

    &:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
      border-radius: 2px;
    }

    &-line {
      display: block;
      width: 22px;
      height: 2px;
      background: var(--color-text);
      border-radius: 1px;
      transition:
        transform 0.25s ease,
        opacity 0.25s ease;
      transform-origin: center;
    }

    &--open &-line:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }

    &--open &-line:nth-child(2) {
      opacity: 0;
      transform: scaleX(0);
    }

    &--open &-line:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }
  }

  &__nav-wrapper {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
  }
}
</style>
