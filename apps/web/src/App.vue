<template>
  <div id="app">
    <AppHeader />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { AppHeader } from '@/shared'
</script>

<style scoped lang="scss">
#app {
  width: 100%;
  min-height: 100vh;
}
</style>
