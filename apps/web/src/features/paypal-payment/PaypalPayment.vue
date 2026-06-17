<template>
  <div class="paypal-payment">
    <p
      v-if="!ready && !error"
      class="paypal-payment__status"
    >
      Загрузка оплаты…
    </p>
    <p
      v-if="error"
      class="paypal-payment__error"
    >
      {{ error }}
    </p>
    <div
      ref="buttonsEl"
      class="paypal-payment__buttons"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchPaymentConfig,
  createServerPaypalOrder,
  captureServerPayment,
  claimClientPayment,
  type PaymentConfig,
} from './paypalPaymentApi'

const props = defineProps<{ orderId: string; orderNumber: number; amountUsd: number }>()
const emit = defineEmits<{ paid: []; claimed: [] }>()

interface PaypalOrderActions {
  order: {
    create: (options: unknown) => Promise<string>
    capture: () => Promise<{ id: string }>
  }
}
interface PaypalButtons {
  render: (el: HTMLElement) => void
}
interface PaypalSdk {
  Buttons: (options: unknown) => PaypalButtons
}

const buttonsEl = ref<HTMLElement | null>(null)
const ready = ref(false)
const error = ref('')

function getSdk(): PaypalSdk | undefined {
  return (window as unknown as { paypal?: PaypalSdk }).paypal
}

function loadSdk(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (getSdk()) return resolve()
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Не удалось загрузить PayPal'))
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  try {
    const cfg: PaymentConfig = await fetchPaymentConfig()
    if (!cfg.enabled || !cfg.clientId) {
      error.value = 'Оплата временно недоступна'
      return
    }
    await loadSdk(cfg.clientId)
    const sdk = getSdk()
    if (!sdk) {
      error.value = 'Оплата временно недоступна'
      return
    }

    const invoiceId = `natsdoll-${props.orderNumber}`
    const buttons = sdk.Buttons(
      cfg.serverFlow
        ? {
            createOrder: () => createServerPaypalOrder(props.orderId),
            onApprove: async () => {
              await captureServerPayment(props.orderId)
              emit('paid')
            },
            onError: () => { error.value = 'Ошибка оплаты' },
          }
        : {
            createOrder: (_data: unknown, actions: PaypalOrderActions) =>
              actions.order.create({
                purchase_units: [{
                  invoice_id: invoiceId,
                  custom_id: invoiceId,
                  amount: { currency_code: 'USD', value: props.amountUsd.toFixed(2) },
                }],
              }),
            onApprove: async (_data: unknown, actions: PaypalOrderActions) => {
              const captured = await actions.order.capture()
              await claimClientPayment(props.orderId, captured.id)
              emit('claimed')
            },
            onError: () => { error.value = 'Ошибка оплаты' },
          },
    )
    if (buttonsEl.value) buttons.render(buttonsEl.value)
    ready.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка'
  }
})
</script>

<style scoped lang="scss">
.paypal-payment {
  &__status {
    color: var(--color-text-muted);
  }

  &__error {
    color: #c0392b;
  }

  &__buttons {
    min-height: 48px;
  }
}
</style>
