<template>
  <OrderConfirmationPage />
</template>

<script setup lang="ts">
import OrderConfirmationPage from '@/pages/OrderConfirmationPage.vue'

definePageMeta({ name: 'order-confirmation', middleware: 'auth' })
</script>
