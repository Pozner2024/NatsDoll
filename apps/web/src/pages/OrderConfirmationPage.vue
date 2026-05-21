<template>
  <OrderConfirmation :order-id="orderId" />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { OrderConfirmation } from '@/widgets/order-confirmation'

const route = useRoute()
const orderId = route.params.id as string
</script>
