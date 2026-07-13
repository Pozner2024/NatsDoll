<template>
  <div
    v-if="pendingOrder"
    class="cart-page__pending-order"
  >
    <p class="cart-page__pending-order-text">
      You have an unpaid order #{{ pendingOrder.orderNumber }} for {{ formatPrice(pendingOrder.totalAmount) }}.
    </p>
    <div class="cart-page__pending-order-actions">
      <AppButton
        class="cart-page__pending-order-btn"
        @click="goToPendingOrder"
      >
        Pay
      </AppButton>
      <button
        type="button"
        class="cart-page__pending-order-cancel"
        :disabled="cancellingOrder"
        @click="onCancelPendingOrder"
      >
        {{ cancellingOrder ? 'Cancelling…' : 'Cancel order' }}
      </button>
    </div>
    <p
      v-if="cancelError"
      class="cart-page__pending-order-error"
    >
      {{ cancelError }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AppButton, formatPrice } from '@/shared'
import { useAuthStore } from '@/entities/user'
import { useOrderStore } from '@/entities/order'

const router = useRouter()
const authStore = useAuthStore()
const orderStore = useOrderStore()

const dismissedOrderId = ref<string | null>(null)
const pendingOrder = computed(() => {
  if (!authStore.isLoggedIn) return null
  return orderStore.myOrders.find((o) => o.status === 'PENDING' && o.id !== dismissedOrderId.value) ?? null
})
const cancellingOrder = ref(false)
const cancelError = ref('')

function goToPendingOrder(): void {
  if (!pendingOrder.value) return
  router.push({ name: 'order-confirmation', params: { id: pendingOrder.value.id } })
}

async function onCancelPendingOrder(): Promise<void> {
  if (!pendingOrder.value) return
  const orderId = pendingOrder.value.id
  cancelError.value = ''
  cancellingOrder.value = true
  try {
    await orderStore.cancel(orderId)
    dismissedOrderId.value = orderId
  } catch {
    cancelError.value = 'Could not cancel the order'
  } finally {
    cancellingOrder.value = false
  }
}
</script>

<style scoped lang="scss">
.cart-page {
  &__pending-order {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    padding: 0.9rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: rgb(var(--btn-gradient-light) / 0.4);
  }

  &__pending-order-text {
    flex: 1 1 220px;
    margin: 0;
    color: var(--color-text);
    font-size: var(--fs-sm);
  }

  &__pending-order-actions {
    display: flex;
    align-items: center;
    gap: 0.9rem;
  }

  &__pending-order-btn {
    --btn-font-size: var(--fs-sm);
  }

  &__pending-order-cancel {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    text-decoration: underline;

    &:disabled {
      opacity: 0.6;
    }
  }

  &__pending-order-error {
    flex-basis: 100%;
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--color-error);
  }
}
</style>
