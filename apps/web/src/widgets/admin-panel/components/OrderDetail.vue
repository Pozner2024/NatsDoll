<template>
  <div class="order-detail">
    <div
      v-if="!order"
      class="order-detail__empty"
    >
      Select an order
    </div>

    <template v-else>
      <div class="order-detail__header">
        <button
          class="order-detail__back"
          @click="$emit('back')"
        >
          ←
        </button>
        <div class="order-detail__meta">
          <div class="order-detail__title-row">
            <span class="order-detail__number">Order #{{ order.orderNumber }}</span>
            <span
              class="order-detail__badge"
              :class="`order-detail__badge--${order.status.toLowerCase()}`"
            >{{ order.status }}</span>
          </div>
          <span class="order-detail__date">{{ formatDate(order.createdAt) }}</span>
          <span class="order-detail__customer">{{ order.userName }} · {{ order.userEmail }}</span>
          <button
            class="order-detail__message-btn"
            @click="$emit('message-buyer', order.userId)"
          >
            ✉ Message buyer
          </button>
        </div>
      </div>

      <div class="order-detail__body">
        <section class="order-detail__section">
          <h3 class="order-detail__section-title">
            Items
          </h3>
          <div
            v-for="item in order.items"
            :key="item.id"
            class="order-detail__item"
          >
            <div class="order-detail__item-img">
              <img
                v-if="item.productImage"
                :src="item.productImage"
                :alt="item.productName"
              >
              <span
                v-else
                class="order-detail__item-img-placeholder"
              >?</span>
            </div>
            <div class="order-detail__item-info">
              <span class="order-detail__item-name">{{ item.productName }}</span>
              <span
                v-if="item.message"
                class="order-detail__item-msg"
              >"{{ item.message }}"</span>
              <span class="order-detail__item-qty">× {{ item.quantity }}</span>
            </div>
            <span class="order-detail__item-subtotal">{{ formatPrice(item.subtotal) }}</span>
          </div>
        </section>

        <section class="order-detail__section order-detail__section--row">
          <div class="order-detail__address">
            <h3 class="order-detail__section-title">
              Shipping address
            </h3>
            <p>{{ order.shippingAddress.fullName }}</p>
            <p>{{ order.shippingAddress.line1 }}</p>
            <p v-if="order.shippingAddress.line2">
              {{ order.shippingAddress.line2 }}
            </p>
            <p>{{ order.shippingAddress.city }}, {{ order.shippingAddress.postalCode }}</p>
            <p>{{ order.shippingAddress.country }}</p>
          </div>

          <div class="order-detail__totals">
            <div class="order-detail__totals-row">
              <span>Shipping</span>
              <span>{{ formatPrice(order.shippingCost) }}</span>
            </div>
            <div class="order-detail__totals-row order-detail__totals-row--grand">
              <span>Total</span>
              <span>{{ formatPrice(order.totalAmount) }}</span>
            </div>
          </div>
        </section>

        <form
          class="order-detail__form"
          @submit.prevent="handleSave"
        >
          <h3 class="order-detail__section-title">
            Edit order
          </h3>

          <div class="order-detail__field">
            <label class="order-detail__label">Status</label>
            <select
              v-model="draft.status"
              class="order-detail__select"
            >
              <option value="PENDING">
                PENDING
              </option>
              <option value="PAID">
                PAID
              </option>
              <option value="PROCESSING">
                PROCESSING
              </option>
              <option value="SHIPPED">
                SHIPPED
              </option>
              <option value="DELIVERED">
                DELIVERED
              </option>
              <option value="CANCELLED">
                CANCELLED
              </option>
              <option value="REFUNDED">
                REFUNDED
              </option>
            </select>
          </div>

          <div class="order-detail__field">
            <label class="order-detail__label">
              Tracking number
              <span class="order-detail__hint-inline">— visible to customer</span>
            </label>
            <input
              v-model="draft.trackingNumber"
              class="order-detail__input"
              placeholder="e.g. 1Z999AA10123456784"
            >
            <span class="order-detail__hint">Customer receives an email when tracking is first added.</span>
          </div>

          <div class="order-detail__field">
            <label class="order-detail__label">
              Admin note
              <span class="order-detail__hint-inline">— only you see this</span>
            </label>
            <textarea
              v-model="draft.adminNote"
              class="order-detail__textarea"
              rows="3"
              placeholder="Internal notes…"
            />
          </div>

          <p
            v-if="saveError"
            class="order-detail__error"
          >
            {{ saveError }}
          </p>

          <AppButton
            type="submit"
            :disabled="!isDirty || saving"
          >
            {{ saving ? 'Saving…' : 'Save changes' }}
          </AppButton>
        </form>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { AppButton, formatPrice, formatDate } from '@/shared'
import type { AdminOrderDetail, UpdateOrderInput } from '../adminOrdersApi'

const props = defineProps<{
  order: AdminOrderDetail | null
  saving: boolean
}>()

const emit = defineEmits<{
  save: [payload: UpdateOrderInput]
  back: []
  'message-buyer': [userId: string]
}>()

type Draft = { status: string; trackingNumber: string; adminNote: string }

const draft = ref<Draft>({ status: '', trackingNumber: '', adminNote: '' })
const saveError = ref('')

watch(() => props.order, (o) => {
  if (o) {
    draft.value = {
      status: o.status,
      trackingNumber: o.trackingNumber ?? '',
      adminNote: o.adminNote ?? '',
    }
    saveError.value = ''
  }
}, { immediate: true })

const isDirty = computed(() => {
  if (!props.order) return false
  return (
    draft.value.status !== props.order.status ||
    (draft.value.trackingNumber || null) !== props.order.trackingNumber ||
    (draft.value.adminNote || null) !== props.order.adminNote
  )
})

function handleSave() {
  saveError.value = ''
  emit('save', {
    status: draft.value.status,
    trackingNumber: draft.value.trackingNumber.trim() || null,
    adminNote: draft.value.adminNote.trim() || null,
  })
}

function setError(msg: string) {
  saveError.value = msg
}

defineExpose({ setError })
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.order-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  &__back {
    background: none;
    border: none;
    font-size: 1.2rem;
    color: var(--color-text-muted);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    line-height: 1;
    flex-shrink: 0;

    &:hover {
      background: var(--color-border);
    }

    @include tablet {
      display: none;
    }
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__number {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__badge {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;

    &--pending {
      background: rgb(212 160 23 / 0.15);
      color: var(--color-gold);
    }

    &--paid,
    &--processing {
      background: rgb(0 120 200 / 0.1);
      color: #0078c8;
    }

    &--shipped,
    &--delivered {
      background: rgb(39 174 96 / 0.12);
      color: #1a7a42;
    }

    &--cancelled,
    &--refunded {
      background: rgb(192 57 43 / 0.1);
      color: var(--color-error);
    }
  }

  &__date {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  &__message-btn {
    margin-top: 0.35rem;
    align-self: flex-start;
    background: none;
    border: 1px solid var(--color-accent);
    color: var(--color-accent);
    border-radius: 6px;
    padding: 0.25rem 0.65rem;
    font-size: 0.78rem;
    font-family: var(--font-display);

    &:hover {
      background: rgb(var(--btn-gradient-light) / 0.08);
    }
  }

  &__customer {
    font-size: 0.82rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__section {
    &-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.75rem;
    }

    &--row {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      @include tablet {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }
    }
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  &__item-img {
    width: 52px;
    height: 52px;
    border-radius: 6px;
    overflow: hidden;
    background: rgb(var(--btn-gradient-light) / 0.4);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__item-img-placeholder {
    font-size: 1.2rem;
    color: var(--color-border);
  }

  &__item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  &__item-name {
    font-size: 0.88rem;
    color: var(--color-text);
    font-weight: 500;
  }

  &__item-msg {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__item-qty {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  &__item-subtotal {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
  }

  &__address {
    font-size: 0.88rem;
    color: var(--color-text);
    line-height: 1.6;
  }

  &__totals {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  &__totals-row {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    font-size: 0.88rem;
    color: var(--color-text-muted);

    &--grand {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text);
      padding-top: 0.35rem;
      border-top: 1px solid var(--color-border);
      margin-top: 0.15rem;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 2px solid var(--color-border);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  &__label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__hint-inline {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.75rem;
  }

  &__hint {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__select,
  &__input,
  &__textarea {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.6rem 0.875rem;
    font-size: 0.9rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__textarea {
    resize: vertical;
    min-height: 72px;
  }

  &__error {
    font-size: 0.82rem;
    color: var(--color-error);
  }
}
</style>
