<template>
  <header class="app-header">
    <span class="app-header__logo corinthia-bold">NatsDoll</span>
    <button
      class="app-header__burger"
      :class="{ 'app-header__burger--open': isOpen }"
      aria-label="Открыть меню"
      @click="isOpen = !isOpen"
    >
      <span class="app-header__burger-line"></span>
      <span class="app-header__burger-line"></span>
      <span class="app-header__burger-line"></span>
    </button>

    <div class="app-header__nav-wrapper">
      <NavMenu :is-open="isOpen" @close="isOpen = false" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { NavMenu } from '@/features/navigation'

const isOpen = ref(false)

function handleOutsideClick(event: MouseEvent) {
  const header = document.querySelector('.app-header')
  if (isOpen.value && header && !header.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleOutsideClick))
onUnmounted(() => document.removeEventListener('click', handleOutsideClick))
</script>

<style scoped lang="scss">
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e8e0d8;
  position: relative;

  &__logo {
    font-size: 32px;
    color: #2c1810;
    letter-spacing: 1px;
    line-height: 1;
  }

  &__burger {
    display: flex;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;

    &-line {
      display: block;
      width: 22px;
      height: 2px;
      background: #2c1810;
      border-radius: 1px;
      transition: transform 0.25s ease, opacity 0.25s ease;
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
