<template>
  <form
    id="checkout-form"
    class="checkout-form"
    novalidate
    @submit.prevent
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
        :aria-invalid="!!errors.fullName || undefined"
        :aria-describedby="errors.fullName ? 'cf-name-error' : undefined"
      >
      <span
        v-if="errors.fullName"
        id="cf-name-error"
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
        :aria-invalid="!!errors.line1 || undefined"
        :aria-describedby="errors.line1 ? 'cf-line1-error' : undefined"
      >
      <span
        v-if="errors.line1"
        id="cf-line1-error"
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
          :aria-invalid="!!errors.city || undefined"
          :aria-describedby="errors.city ? 'cf-city-error' : undefined"
        >
        <span
          v-if="errors.city"
          id="cf-city-error"
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
          :aria-invalid="!!errors.postalCode || undefined"
          :aria-describedby="errors.postalCode ? 'cf-postal-error' : undefined"
        >
        <span
          v-if="errors.postalCode"
          id="cf-postal-error"
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
        :aria-invalid="!!errors.country || undefined"
        :aria-describedby="errors.country ? 'cf-country-error' : undefined"
      >
      <span
        v-if="errors.country"
        id="cf-country-error"
        class="checkout-form__error"
      >{{ errors.country }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { reactive, onMounted, nextTick } from 'vue'
import type { ShippingAddress } from '@/entities/order'
import { useAddressStore } from '@/entities/address'
import { useAuthStore } from '@/entities/user'

const addressStore = useAddressStore()
const authStore = useAuthStore()

const form = reactive({
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  country: '',
  postalCode: '',
})

onMounted(async () => {
  if (!authStore.isLoggedIn) return
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

function validate(): boolean {
  errors.fullName = form.fullName.trim() ? '' : 'Required'
  errors.line1 = form.line1.trim() ? '' : 'Required'
  errors.city = form.city.trim() ? '' : 'Required'
  errors.country = form.country.trim() ? '' : 'Required'
  errors.postalCode = form.postalCode.trim() ? '' : 'Required'
  return !errors.fullName && !errors.line1 && !errors.city && !errors.country && !errors.postalCode
}

async function focusFirstInvalid() {
  await nextTick()
  document.querySelector<HTMLElement>('.checkout-form [aria-invalid="true"]')?.focus()
}

function getValidatedAddress(): ShippingAddress | null {
  if (!validate()) {
    void focusFirstInvalid()
    return null
  }
  const address: ShippingAddress = {
    fullName: form.fullName,
    line1: form.line1,
    city: form.city,
    country: form.country,
    postalCode: form.postalCode,
  }
  if (form.line2.trim()) address.line2 = form.line2
  return address
}

defineExpose({ getValidatedAddress })
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

}
</style>
