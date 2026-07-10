<template>
  <section class="cart-page">
    <h1 class="cart-page__title">
      Your cart
    </h1>

    <p
      v-if="actionError"
      class="cart-page__action-error"
    >
      {{ actionError }}
    </p>

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

    <div
      v-if="loading"
      class="cart-page__loading"
    >
      Loading…
    </div>

    <div
      v-else-if="error"
      class="cart-page__error"
    >
      {{ error }}
    </div>

    <div
      v-else-if="items.length === 0 && !pending"
      class="cart-page__empty"
    >
      <p class="cart-page__empty-text">
        Your cart is empty.
      </p>
      <RouterLink
        to="/shop"
        class="cart-page__empty-link"
      >
        Browse the shop
      </RouterLink>
    </div>

    <div
      v-else
      class="cart-page__layout"
    >
      <div class="cart-page__main">
        <ul class="cart-page__items">
          <CartLineItem
            v-for="item in items"
            :key="item.id"
            :item="item"
            :disabled="!!pending"
            @update="onUpdate"
            @remove="onRemove"
          />
        </ul>

        <div
          v-if="!authStore.isLoggedIn"
          class="cart-page__guest-email"
        >
          <label
            for="guest-email"
            class="cart-page__guest-email-label"
          >
            Email
            <span
              aria-hidden="true"
              class="cart-page__guest-email-required"
            >*</span>
          </label>
          <input
            id="guest-email"
            v-model="guestEmail"
            type="email"
            autocomplete="email"
            class="cart-page__guest-email-input"
            placeholder="your@email.com"
            @input="guestEmailError = ''; emailTaken = false; signInLinkSent = false"
          >
          <p
            v-if="guestEmailError"
            class="cart-page__guest-email-error"
          >
            {{ guestEmailError }}
          </p>
          <p
            v-if="emailTaken && signInLinkSent"
            class="cart-page__guest-email-taken"
          >
            We've emailed a sign-in link to {{ guestEmail }}. Check your inbox to continue.
          </p>
          <p
            v-else-if="emailTaken"
            class="cart-page__guest-email-taken"
          >
            An account with this email exists —
            <button
              type="button"
              class="cart-page__sign-in-btn"
              @click="authModal.open('login')"
            >
              sign in
            </button>
            or
            <button
              type="button"
              class="cart-page__sign-in-btn"
              @click="sendSignInLink"
            >
              email me a sign-in link
            </button>
          </p>
        </div>

        <CheckoutForm ref="checkoutFormRef" />
      </div>

      <aside class="cart-page__summary">
        <h2 class="cart-page__summary-title">
          Summary
        </h2>
        <p class="cart-page__summary-row">
          <span>Items</span>
          <span>{{ itemCount }}</span>
        </p>
        <p class="cart-page__summary-row">
          <span>Subtotal</span>
          <span>{{ formatPrice(subtotal) }}</span>
        </p>
        <p class="cart-page__summary-row">
          <span>Shipping</span>
          <span>{{ formatPrice(shippingCost) }}</span>
        </p>
        <p class="cart-page__summary-row cart-page__summary-row--total">
          <span>Total</span>
          <span>{{ formatPrice(grandTotal) }}</span>
        </p>
        <template v-if="paymentsReady">
          <WooPayButton
            v-if="paymentsEnabled && paymentConfig?.external"
            class="cart-page__pay"
            :on-validate="validateAddress"
            :prepare-order="prepareOrder"
            @redirecting="onExternalRedirect"
          />
          <PaypalPayment
            v-else-if="paymentsEnabled"
            class="cart-page__pay"
            :amount-usd="grandTotal"
            :on-validate="validateAddress"
            :prepare-order="prepareOrder"
            @paid="goToReceipt(false)"
            @claimed="goToReceipt(true)"
          />
          <AppButton
            v-else
            class="cart-page__checkout"
            :disabled="placingOrder"
            @click="placeOrderFallback"
          >
            {{ placingOrder ? 'Placing order…' : 'Place order' }}
          </AppButton>
        </template>
        <p
          v-if="orderError"
          class="cart-page__pay-error"
        >
          {{ orderError }}
        </p>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { AppButton, formatPrice, calcShipping, fetchShippingSettings, useAuthModal, validateEmail } from '@/shared'
import type { ShippingRates } from '@/shared'
import { useCartStore } from '@/entities/cart'
import { useAuthStore } from '@/entities/user'
import { useOrderStore } from '@/entities/order'
import { CheckoutForm } from '@/features/checkout-form'
import { PaypalPayment, fetchPaymentConfig } from '@/features/paypal-payment'
import type { PaymentConfig } from '@/features/paypal-payment'
import { WooPayButton } from '@/features/woo-payment'
import { usePendingOrder } from './usePendingOrder'
import { GuestEmailTakenError } from './guestCheckoutApi'
import type { ShippingAddress } from '@/entities/order'
import CartLineItem from './components/CartLineItem.vue'

const router = useRouter()
const cartStore = useCartStore()
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

const items = computed(() => cartStore.items)
const itemCount = computed(() => cartStore.itemCount)
const subtotal = computed(() => cartStore.totalAmount)
const totalItemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
const shippingRates = ref<ShippingRates | null>(null)
const shippingCost = computed(() =>
  calcShipping(totalItemCount.value, shippingRates.value?.baseCost, shippingRates.value?.perExtraItemCost),
)
const grandTotal = computed(() => subtotal.value + shippingCost.value)
const loading = computed(() => cartStore.loading)
const error = computed(() => cartStore.error)
const actionError = ref<string | null>(null)

const authModal = useAuthModal()
const guestEmail = ref('')
const guestEmailError = ref('')
const emailTaken = ref(false)
const signInLinkSent = ref(false)

async function sendSignInLink() {
  try {
    await authStore.requestPasswordReset(guestEmail.value.trim())
  } catch {
    // generic flow: всё равно показываем «проверьте почту», не раскрывая существование аккаунта
  }
  signInLinkSent.value = true
}

const checkoutFormRef = ref<{ getValidatedAddress: () => ShippingAddress | null } | null>(null)
const { pending, error: orderError, prepare } = usePendingOrder()

const paymentConfig = ref<PaymentConfig | null>(null)
const paymentsReady = computed(() => paymentConfig.value !== null)
const paymentsEnabled = computed(() => !!paymentConfig.value?.enabled && (!!paymentConfig.value.clientId || !!paymentConfig.value.external))
const placingOrder = ref(false)

function validateAddress(): boolean {
  if (!authStore.isLoggedIn) {
    const emailErr = validateEmail(guestEmail.value)
    if (emailErr) {
      guestEmailError.value = emailErr
      return false
    }
  }
  return checkoutFormRef.value?.getValidatedAddress?.() != null
}

async function prepareOrder() {
  const address = checkoutFormRef.value?.getValidatedAddress?.()
  if (!address) return null

  if (!authStore.isLoggedIn) {
    const emailErr = validateEmail(guestEmail.value)
    if (emailErr) {
      guestEmailError.value = emailErr
      return null
    }
    guestEmailError.value = ''
    emailTaken.value = false
    signInLinkSent.value = false
    try {
      return await prepare(address, {
        email: guestEmail.value.trim(),
        items: cartStore.guestItems,
        amountUsd: grandTotal.value,
      })
    } catch (e) {
      if (e instanceof GuestEmailTakenError) {
        emailTaken.value = true
        return null
      }
      throw e
    }
  }

  return prepare(address)
}

function onExternalRedirect(): void {
  cartStore.reset()
}

function goToReceipt(claimed: boolean): void {
  if (!pending.value) return
  cartStore.reset()
  router.push({
    name: 'order-confirmation',
    params: { id: pending.value.orderId },
    ...(claimed ? { query: { claimed: '1' } } : {}),
  })
}

async function placeOrderFallback(): Promise<void> {
  if (!authStore.isLoggedIn) {
    const emailErr = validateEmail(guestEmail.value)
    if (emailErr) {
      guestEmailError.value = emailErr
      return
    }
  }
  if (!validateAddress()) return
  placingOrder.value = true
  try {
    const order = await prepareOrder()
    if (order) goToReceipt(false)
  } finally {
    placingOrder.value = false
  }
}

onMounted(async () => {
  if (!authStore.authReady) await authStore.initAuth()
  await cartStore.load()
  if (authStore.isLoggedIn) await orderStore.loadMyOrders()
  try {
    paymentConfig.value = await fetchPaymentConfig()
  } catch {
    paymentConfig.value = { enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false, external: false }
  }
  shippingRates.value = await fetchShippingSettings()
})

async function onUpdate(itemId: string, quantity: number): Promise<void> {
  actionError.value = null
  try {
    await cartStore.update(itemId, quantity)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not update the cart'
    await cartStore.load(true)
  }
}

async function onRemove(itemId: string): Promise<void> {
  actionError.value = null
  try {
    await cartStore.remove(itemId)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Could not update the cart'
    await cartStore.load(true)
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.cart-page {
  padding: 1.5rem 1rem 3rem;
  max-width: 1100px;
  margin: 0 auto;

  @include tablet {
    padding: 2rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 1.5rem;
    color: var(--color-text);

    @include tablet {
      font-size: 2rem;
    }
  }

  &__loading,
  &__error,
  &__empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
  }

  &__empty-link {
    display: inline-block;
    margin-top: 0.75rem;
    color: var(--color-accent);
    text-decoration: underline;
  }

  &__action-error {
    margin-bottom: 1rem;
    padding: 0.6rem 0.9rem;
    border-radius: 6px;
    background: rgb(180 30 30 / 0.08);
    color: rgb(180 30 30 / 1);
    font-size: var(--fs-sm);
  }

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

  &__layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    @include tablet {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    flex: 1;
  }

  &__items {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__summary {
    background: rgb(var(--btn-gradient-light) / 0.4);
    padding: 1rem;
    border-radius: 6px;

    @include tablet {
      width: 320px;
      flex-shrink: 0;
    }
  }

  &__summary-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  &__summary-row {
    display: flex;
    justify-content: space-between;
    padding: 0.4rem 0;
    color: var(--color-text-muted);

    &--total {
      font-weight: 700;
      color: var(--color-text);
      border-top: 1px solid var(--color-border);
      margin-top: 0.5rem;
      padding-top: 0.75rem;
    }
  }

  &__guest-email {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__guest-email-label {
    font-size: var(--fs-sm);
    font-weight: 500;
    color: var(--color-text);
  }

  &__guest-email-required {
    color: var(--color-error);
    margin-left: 0.2rem;
  }

  &__guest-email-input {
    width: 100%;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    font-family: inherit;
    font-size: var(--fs-sm);
    color: var(--color-text);
    background: var(--color-bg);
    outline: none;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__guest-email-error {
    font-size: var(--fs-sm);
    color: var(--color-error);
    margin: 0;
  }

  &__guest-email-taken {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    margin: 0;
  }

  &__sign-in-btn {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    color: var(--color-accent);
    text-decoration: underline;
  }

  &__pay {
    margin-top: 0.75rem;
  }

  &__checkout {
    width: 100%;
    margin-top: 0.75rem;
  }

  &__pay-error {
    margin-top: 0.5rem;
    font-size: var(--fs-sm);
    color: var(--color-error);
  }
}
</style>
