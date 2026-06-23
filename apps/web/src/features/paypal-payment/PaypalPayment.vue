<template>
  <div class="paypal-payment">
    <p
      v-if="!ready && !error"
      class="paypal-payment__status"
    >
      Loading payment…
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

const props = defineProps<{
  orderId?: string
  orderNumber?: number
  amountUsd: number
  onValidate?: () => boolean
  prepareOrder?: () => Promise<{ orderId: string; orderNumber: number; amountUsd: number } | null>
}>()
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

let active: { orderId: string; orderNumber: number; amountUsd: number } | null = null

async function resolveOrder(): Promise<{ orderId: string; orderNumber: number; amountUsd: number } | null> {
  if (props.prepareOrder) return props.prepareOrder()
  if (props.orderId && props.orderNumber != null) {
    return { orderId: props.orderId, orderNumber: props.orderNumber, amountUsd: props.amountUsd }
  }
  return null
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
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&locale=en_US`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load PayPal'))
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  try {
    const cfg: PaymentConfig = await fetchPaymentConfig()
    if (!cfg.enabled || !cfg.clientId) {
      error.value = 'Payments are temporarily unavailable'
      return
    }
    await loadSdk(cfg.clientId)
    const sdk = getSdk()
    if (!sdk) {
      error.value = 'Payments are temporarily unavailable'
      return
    }

    const onClick = (_data: unknown, actions: { resolve: () => void; reject: () => void }) => {
      if (props.onValidate && !props.onValidate()) return actions.reject()
      return actions.resolve()
    }

    const buttons = sdk.Buttons(
      cfg.serverFlow
        ? {
            onClick,
            createOrder: async () => {
              active = await resolveOrder()
              if (!active) throw new Error('Order not ready')
              return createServerPaypalOrder(active.orderId)
            },
            onApprove: async () => {
              if (!active) return
              await captureServerPayment(active.orderId)
              emit('paid')
            },
            onError: () => { error.value = 'Payment failed' },
          }
        : {
            onClick,
            createOrder: async (_data: unknown, actions: PaypalOrderActions) => {
              active = await resolveOrder()
              if (!active) throw new Error('Order not ready')
              return actions.order.create({
                purchase_units: [{
                  invoice_id: `natsdoll-${active.orderNumber}`,
                  custom_id: `natsdoll-${active.orderNumber}`,
                  amount: { currency_code: 'USD', value: active.amountUsd.toFixed(2) },
                }],
              })
            },
            onApprove: async (_data: unknown, actions: PaypalOrderActions) => {
              if (!active) return
              const captured = await actions.order.capture()
              await claimClientPayment(active.orderId, captured.id)
              emit('claimed')
            },
            onError: () => { error.value = 'Payment failed' },
          },
    )
    if (buttonsEl.value) buttons.render(buttonsEl.value)
    ready.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
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
