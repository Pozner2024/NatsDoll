<template>
  <div class="shop-page">
    <ShopCatalog />
  </div>
</template>

<script setup lang="ts">
import { ShopCatalog } from '@/widgets/shop-catalog'
</script>

<style scoped lang="scss">
.shop-page {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
