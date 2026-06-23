<template>
  <section class="account-addresses">
    <div class="account-addresses__header">
      <h2 class="account-addresses__title">
        Addresses
      </h2>
      <AppButton
        v-if="!showForm"
        class="account-addresses__add-btn"
        @click="openAdd"
      >
        + Add address
      </AppButton>
    </div>

    <p
      v-if="loading && addresses.length === 0"
      class="account-addresses__status"
    >
      Loading…
    </p>

    <p
      v-else-if="store.error"
      class="account-addresses__status account-addresses__status--error"
    >
      {{ store.error }}
    </p>

    <template v-else>
      <div
        v-if="addresses.length > 0"
        class="account-addresses__list"
      >
        <div
          v-for="address in addresses"
          :key="address.id"
          class="account-addresses__card"
          :class="{ 'account-addresses__card--default': address.isDefault }"
        >
          <div class="account-addresses__card-body">
            <p class="account-addresses__card-name">
              {{ address.fullName }}
            </p>
            <p>{{ address.line1 }}</p>
            <p v-if="address.line2">
              {{ address.line2 }}
            </p>
            <p>{{ address.city }}, {{ address.postalCode }}</p>
            <p>{{ address.country }}</p>
            <span
              v-if="address.isDefault"
              class="account-addresses__default-badge"
            >Default</span>
          </div>
          <div class="account-addresses__card-actions">
            <button
              class="account-addresses__action-btn"
              @click="openEdit(address)"
            >
              Edit
            </button>
            <button
              v-if="!address.isDefault"
              class="account-addresses__action-btn"
              @click="handleSetDefault(address.id)"
            >
              Set default
            </button>
            <button
              class="account-addresses__action-btn account-addresses__action-btn--danger"
              @click="handleRemove(address.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div
        v-else-if="!showForm"
        class="account-addresses__empty"
      >
        <svg
          class="account-addresses__empty-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          aria-hidden="true"
        >
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
          <circle
            cx="12"
            cy="10"
            r="3"
          />
        </svg>
        <p>No saved addresses</p>
        <p class="account-addresses__hint">
          Saved addresses will be pre-filled at checkout
        </p>
      </div>

      <form
        v-if="showForm"
        class="account-addresses__form"
        @submit.prevent="submitForm"
      >
        <h3 class="account-addresses__form-title">
          {{ editingId ? 'Edit address' : 'New address' }}
        </h3>

        <div class="account-addresses__field">
          <label class="account-addresses__label">Full name</label>
          <input
            v-model="form.fullName"
            class="account-addresses__input"
            type="text"
            required
          >
        </div>
        <div class="account-addresses__field">
          <label class="account-addresses__label">Address line 1</label>
          <input
            v-model="form.line1"
            class="account-addresses__input"
            type="text"
            required
          >
        </div>
        <div class="account-addresses__field">
          <label class="account-addresses__label">Address line 2 <span class="account-addresses__optional">(optional)</span></label>
          <input
            v-model="form.line2"
            class="account-addresses__input"
            type="text"
          >
        </div>
        <div class="account-addresses__row">
          <div class="account-addresses__field">
            <label class="account-addresses__label">City</label>
            <input
              v-model="form.city"
              class="account-addresses__input"
              type="text"
              required
            >
          </div>
          <div class="account-addresses__field">
            <label class="account-addresses__label">Postal code</label>
            <input
              v-model="form.postalCode"
              class="account-addresses__input"
              type="text"
              required
            >
          </div>
        </div>
        <div class="account-addresses__field">
          <label class="account-addresses__label">Country</label>
          <input
            v-model="form.country"
            class="account-addresses__input"
            type="text"
            required
          >
        </div>

        <p
          v-if="formError"
          class="account-addresses__hint account-addresses__hint--error"
        >
          {{ formError }}
        </p>

        <div class="account-addresses__form-actions">
          <AppButton
            type="submit"
            :disabled="formSaving"
          >
            {{ formSaving ? 'Saving…' : (editingId ? 'Save changes' : 'Add address') }}
          </AppButton>
          <button
            type="button"
            class="account-addresses__cancel-btn"
            @click="closeForm"
          >
            Cancel
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { AppButton } from '@/shared'
import { useAddressStore } from '@/entities/address'
import type { Address } from '@/entities/address'

const store = useAddressStore()
const addresses = computed(() => store.addresses)
const loading = computed(() => store.loading)

const showForm = ref(false)
const editingId = ref<string | null>(null)
const formSaving = ref(false)
const formError = ref('')

const form = reactive({
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  country: '',
  postalCode: '',
})

function openAdd() {
  editingId.value = null
  form.fullName = ''
  form.line1 = ''
  form.line2 = ''
  form.city = ''
  form.country = ''
  form.postalCode = ''
  formError.value = ''
  showForm.value = true
}

function openEdit(address: Address) {
  editingId.value = address.id
  form.fullName = address.fullName
  form.line1 = address.line1
  form.line2 = address.line2 ?? ''
  form.city = address.city
  form.country = address.country
  form.postalCode = address.postalCode
  formError.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  formError.value = ''
}

async function handleRemove(id: string) {
  formError.value = ''
  try {
    await store.remove(id)
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Failed to delete address'
  }
}

async function handleSetDefault(id: string) {
  formError.value = ''
  try {
    await store.setDefault(id)
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Failed to update default address'
  }
}

async function submitForm() {
  formError.value = ''
  formSaving.value = true
  try {
    const data = {
      fullName: form.fullName,
      line1: form.line1,
      city: form.city,
      country: form.country,
      postalCode: form.postalCode,
      ...(form.line2.trim() ? { line2: form.line2 } : {}),
    }
    if (editingId.value) {
      await store.update(editingId.value, data)
    } else {
      await store.add(data)
    }
    closeForm()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    formSaving.value = false
  }
}

onMounted(() => {
  store.load()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.account-addresses {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--color-text);
  }

  &__add-btn {
    --btn-font-size: 0.8rem;

    flex-shrink: 0;
    padding: 0.5rem 1.25rem;
  }

  &__status {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  &__card {
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: var(--color-text);
    line-height: 1.5;

    @include tablet {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
    }

    &--default {
      border-color: var(--color-accent);
    }
  }

  &__card-name {
    font-weight: 600;
  }

  &__default-badge {
    display: inline-block;
    margin-top: 0.4rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    background: rgb(var(--btn-gradient-light) / 0.7);
    color: var(--color-accent);
  }

  &__card-actions {
    display: flex;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__action-btn {
    font-size: 0.8rem;
    color: var(--color-accent);
    text-decoration: underline;
    background: none;
    border: none;
    font-family: var(--font-display);

    &--danger {
      color: var(--color-error);
    }
  }

  &__empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  &__empty-icon {
    width: 48px;
    height: 48px;
    color: var(--color-border);
  }

  &__hint {
    font-size: 0.8rem;

    &--error {
      color: var(--color-error);
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 480px;
    padding: 1.5rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    margin-top: 1rem;
  }

  &__form-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__optional {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }

  &__input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;
    transition: border-color 0.15s;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;

    .account-addresses__field {
      min-width: 0;
    }
  }

  &__form-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__cancel-btn {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-decoration: underline;
    background: none;
    border: none;
    font-family: var(--font-display);
  }
}
</style>
