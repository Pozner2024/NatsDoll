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
          <PaypalPayment
            v-if="paymentsEnabled"
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
import { AppButton, formatPrice, calcShipping, useAuthModal, validateEmail } from '@/shared'
import { useCartStore } from '@/entities/cart'
import { useAuthStore } from '@/entities/user'
import { CheckoutForm } from '@/features/checkout-form'
import { PaypalPayment, fetchPaymentConfig } from '@/features/paypal-payment'
import type { PaymentConfig } from '@/features/paypal-payment'
import { usePendingOrder } from './usePendingOrder'
import { GuestEmailTakenError } from './guestCheckoutApi'
import type { ShippingAddress } from '@/entities/order'
import CartLineItem from './components/CartLineItem.vue'

const router = useRouter()
const cartStore = useCartStore()
const authStore = useAuthStore()

const items = computed(() => cartStore.items)
const itemCount = computed(() => cartStore.itemCount)
const subtotal = computed(() => cartStore.totalAmount)
const totalItemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0))
const shippingCost = computed(() => calcShipping(totalItemCount.value))
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
const paymentsEnabled = computed(() => !!paymentConfig.value?.enabled && !!paymentConfig.value.clientId)
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
  try {
    paymentConfig.value = await fetchPaymentConfig()
  } catch {
    paymentConfig.value = { enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false, external: false }
  }
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
