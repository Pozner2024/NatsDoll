<template>
  <div class="woo-pay-button">
    <AppButton
      class="woo-pay-button__button"
      :disabled="busy"
      @click="onPay"
    >
      {{ busy ? 'Redirecting to payment…' : 'Pay with PayPal or card' }}
    </AppButton>
    <p
      v-if="error"
      class="woo-pay-button__error"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AppButton } from '@/shared'
import { createWooPayment } from './wooPaymentApi'

const props = defineProps<{
  orderId?: string
  onValidate?: () => boolean
  prepareOrder?: () => Promise<{ orderId: string } | null>
}>()
const emit = defineEmits<{ redirecting: [] }>()

const busy = ref(false)
const error = ref('')

async function resolveOrderId(): Promise<string | null> {
  if (props.prepareOrder) {
    const prepared = await props.prepareOrder()
    return prepared?.orderId ?? null
  }
  return props.orderId ?? null
}

async function onPay(): Promise<void> {
  error.value = ''
  if (props.onValidate && !props.onValidate()) return
  busy.value = true
  try {
    const orderId = await resolveOrderId()
    if (!orderId) return
    const payUrl = await createWooPayment(orderId)
    emit('redirecting')
    window.location.assign(payUrl)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped lang="scss">
.woo-pay-button {
  &__error {
    color: #c0392b;
    margin: 0.5rem 0 0;
  }
}
</style>
