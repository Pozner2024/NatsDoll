<template>
  <form
    class="checkout-form"
    novalidate
    @submit.prevent="handleSubmit"
  >
    <h2 class="checkout-form__title">
      Shipping address
    </h2>

    <div class="checkout-form__field">
      <label
        class="checkout-form__label"
        for="cf-name"
      >Full name</label>
      <input
        id="cf-name"
        v-model="form.fullName"
        class="checkout-form__input"
        :class="{ 'checkout-form__input--error': errors.fullName }"
        type="text"
        autocomplete="name"
      >
      <span
        v-if="errors.fullName"
        class="checkout-form__error"
      >{{ errors.fullName }}</span>
    </div>

    <div class="checkout-form__field">
      <label
        class="checkout-form__label"
        for="cf-line1"
      >Address line 1</label>
      <input
        id="cf-line1"
        v-model="form.line1"
        class="checkout-form__input"
        :class="{ 'checkout-form__input--error': errors.line1 }"
        type="text"
        autocomplete="address-line1"
      >
      <span
        v-if="errors.line1"
        class="checkout-form__error"
      >{{ errors.line1 }}</span>
    </div>

    <div class="checkout-form__field">
      <label
        class="checkout-form__label"
        for="cf-line2"
      >Address line 2 <span class="checkout-form__optional">(optional)</span></label>
      <input
        id="cf-line2"
        v-model="form.line2"
        class="checkout-form__input"
        type="text"
        autocomplete="address-line2"
      >
    </div>

    <div class="checkout-form__row">
      <div class="checkout-form__field">
        <label
          class="checkout-form__label"
          for="cf-city"
        >City</label>
        <input
          id="cf-city"
          v-model="form.city"
          class="checkout-form__input"
          :class="{ 'checkout-form__input--error': errors.city }"
          type="text"
          autocomplete="address-level2"
        >
        <span
          v-if="errors.city"
          class="checkout-form__error"
        >{{ errors.city }}</span>
      </div>

      <div class="checkout-form__field">
        <label
          class="checkout-form__label"
          for="cf-postal"
        >Postal code</label>
        <input
          id="cf-postal"
          v-model="form.postalCode"
          class="checkout-form__input"
          :class="{ 'checkout-form__input--error': errors.postalCode }"
          type="text"
          autocomplete="postal-code"
        >
        <span
          v-if="errors.postalCode"
          class="checkout-form__error"
        >{{ errors.postalCode }}</span>
      </div>
    </div>

    <div class="checkout-form__field">
      <label
        class="checkout-form__label"
        for="cf-country"
      >Country</label>
      <input
        id="cf-country"
        v-model="form.country"
        class="checkout-form__input"
        :class="{ 'checkout-form__input--error': errors.country }"
        type="text"
        autocomplete="country-name"
      >
      <span
        v-if="errors.country"
        class="checkout-form__error"
      >{{ errors.country }}</span>
    </div>

    <p
      v-if="submitError"
      class="checkout-form__error checkout-form__error--global"
    >
      {{ submitError }}
    </p>

    <AppButton
      type="submit"
      :disabled="isSubmitting"
      class="checkout-form__submit"
    >
      {{ isSubmitting ? 'Placing order…' : 'Place order' }}
    </AppButton>

    <div class="checkout-form__summary">
      <div class="checkout-form__summary-row">
        <span>Subtotal</span>
        <span>{{ formatPrice(subtotal) }}</span>
      </div>
      <div class="checkout-form__summary-row">
        <span>Shipping</span>
        <span>{{ formatPrice(shippingCost) }}</span>
      </div>
      <div class="checkout-form__summary-row checkout-form__summary-row--total">
        <span>Total</span>
        <span>{{ formatPrice(grandTotal) }}</span>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, computed } from 'vue'
import { AppButton, calcShipping, formatPrice } from '@/shared'
import { useOrderStore } from '@/entities/order'
import type { ShippingAddress } from '@/entities/order'
import { useCartStore } from '@/entities/cart'
import { useAddressStore } from '@/entities/address'

const emit = defineEmits<{
  success: [orderId: string]
}>()

const orderStore = useOrderStore()
const addressStore = useAddressStore()
const cartStore = useCartStore()

const totalItemCount = computed(() =>
  cartStore.items.reduce((sum, item) => sum + item.quantity, 0),
)
const shippingCost = computed(() => calcShipping(totalItemCount.value))
const subtotal = computed(() => cartStore.totalAmount)
const grandTotal = computed(() => subtotal.value + shippingCost.value)

const form = reactive({
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  country: '',
  postalCode: '',
})

onMounted(async () => {
  await addressStore.load()
  const def = addressStore.defaultAddress
  if (def) {
    form.fullName = def.fullName
    form.line1 = def.line1
    form.line2 = def.line2 ?? ''
    form.city = def.city
    form.country = def.country
    form.postalCode = def.postalCode
  }
})

const errors = reactive({
  fullName: '',
  line1: '',
  city: '',
  country: '',
  postalCode: '',
})

const isSubmitting = ref(false)
const submitError = ref('')

function validate(): boolean {
  errors.fullName = form.fullName.trim() ? '' : 'Required'
  errors.line1 = form.line1.trim() ? '' : 'Required'
  errors.city = form.city.trim() ? '' : 'Required'
  errors.country = form.country.trim() ? '' : 'Required'
  errors.postalCode = form.postalCode.trim() ? '' : 'Required'
  return !errors.fullName && !errors.line1 && !errors.city && !errors.country && !errors.postalCode
}

async function handleSubmit() {
  if (!validate()) return
  isSubmitting.value = true
  submitError.value = ''
  try {
    const address: ShippingAddress = {
      fullName: form.fullName,
      line1: form.line1,
      city: form.city,
      country: form.country,
      postalCode: form.postalCode,
    }
    if (form.line2.trim()) address.line2 = form.line2
    const orderId = await orderStore.create(address)
    emit('success', orderId)
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.checkout-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__title {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: var(--color-text);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  &__label {
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text);
  }

  &__optional {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: var(--color-text-muted);
  }

  &__input {
    border: 1px solid var(--color-border);
    padding: 0.6rem 0.75rem;
    font-size: var(--fs-base);
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-white);
    width: 100%;

    &:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: -1px;
    }

    &--error {
      border-color: var(--color-error);
    }
  }

  &__error {
    font-size: var(--fs-xs);
    color: var(--color-error);

    &--global {
      text-align: center;
    }
  }

  &__submit {
    align-self: flex-start;
    margin-top: 0.5rem;
  }

  &__summary {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }

  &__summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: var(--color-text-muted);

    &--total {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin-top: 0.25rem;
    }
  }
}
</style>
