<template>
  <div class="product-info">
    <div class="product-info__header">
      <h1 class="product-info__name">
        {{ product.name }}
      </h1>
      <div class="product-info__price-group">
        <p
          v-if="product.salePrice"
          class="product-info__price-original"
        >
          {{ formatPrice(product.price) }}
        </p>
        <p class="product-info__price">
          {{ formatPrice(product.salePrice ?? product.price) }}
        </p>
      </div>
    </div>

    <MessageSelector
      v-if="hasMessageOptions"
      :options="product.messageOptions"
      :error="messageError"
      @change="onMessageChange"
    />

    <div class="product-info__action">
      <div
        v-if="product.stock > 0"
        class="product-info__qty"
      >
        <button
          type="button"
          class="product-info__qty-btn"
          aria-label="Decrease quantity"
          :disabled="qty <= 1"
          @click="qty--"
        >
          −
        </button>
        <span
          class="product-info__qty-val"
          aria-live="polite"
        >{{ qty }}</span>
        <button
          type="button"
          class="product-info__qty-btn"
          aria-label="Increase quantity"
          :disabled="qty >= product.stock"
          @click="qty++"
        >
          +
        </button>
      </div>

      <AppButton
        type="button"
        class="product-info__btn"
        :disabled="product.stock === 0 || isAdding"
        @click="onAddToCart"
      >
        {{ buttonLabel }}
      </AppButton>
    </div>

    <ul class="product-info__meta">
      <li class="product-info__meta-item">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle
            cx="12"
            cy="10"
            r="3"
          />
        </svg>
        Dispatched from Poland
      </li>
      <li class="product-info__meta-item">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-3.96" />
        </svg>
        Returns &amp; exchanges accepted
      </li>
      <li
        v-if="shippingBaseCost !== null"
        class="product-info__meta-item"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <rect
            x="1"
            y="3"
            width="15"
            height="13"
            rx="1"
          />
          <path d="M16 8h4l3 5v3h-7V8z" />
          <circle
            cx="5.5"
            cy="18.5"
            r="1.5"
          />
          <circle
            cx="18.5"
            cy="18.5"
            r="1.5"
          />
        </svg>
        Delivery cost {{ formatPrice(shippingBaseCost) }}
      </li>
    </ul>

    <hr class="product-info__divider">

    <div
      class="product-info__desc"
      v-html="safeDescription"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import DOMPurify from 'isomorphic-dompurify'
import { AppButton, formatPrice, plainTextToHtml, fetchShippingSettings } from '@/shared'
import type { ProductDetail } from '@/entities/product'
import MessageSelector from './MessageSelector.vue'

const props = defineProps<{ product: ProductDetail }>()
const emit = defineEmits<{ 'add-to-cart': [payload: { quantity: number; message: string | null }] }>()

const shippingBaseCost = ref<number | null>(null)
onMounted(async () => {
  const rates = await fetchShippingSettings()
  if (rates) shippingBaseCost.value = rates.baseCost
})

const qty = ref(1)
const message = ref<string | null>(null)
const messageError = ref<string | undefined>(undefined)
const isAdding = ref(false)

const safeDescription = computed(() =>
  DOMPurify.sanitize(plainTextToHtml(props.product.description), {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'br'],
    ALLOWED_ATTR: [],
  }),
)


const buttonLabel = computed(() => {
  if (props.product.stock === 0) return 'Sold out'
  if (isAdding.value) return 'Adding…'
  return 'Add to cart'
})

const hasMessageOptions = computed(() => props.product.messageOptions.length > 0)

function onMessageChange(value: string | null): void {
  message.value = value
  messageError.value = undefined
}

function onAddToCart(): void {
  if (hasMessageOptions.value) {
    if (message.value === null || message.value.length === 0) {
      messageError.value = 'Please choose a message or type your own'
      return
    }
  }
  isAdding.value = true
  emit('add-to-cart', { quantity: qty.value, message: hasMessageOptions.value ? message.value : null })
}

defineExpose({ resetAdding: () => { isAdding.value = false } })
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-info {
  padding: 1.25rem 1rem 1.5rem;

  @include tablet {
    padding: 1rem 1.25rem 2rem;
  }

  @include desktop {
    padding: 0.5rem 1.5rem 2rem;
  }

  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  &__name {
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.25;
    color: var(--color-text);

    @include tablet {
      font-size: 1.4rem;
    }

    @include desktop {
      font-size: 1.6rem;
    }
  }

  &__price-group {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
    gap: 2px;
  }

  &__price-original {
    font-size: 1rem;
    font-weight: 400;
    color: var(--color-text-muted);
    text-decoration: line-through;
  }

  &__price {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-accent);
    flex-shrink: 0;

    @include tablet {
      font-size: 1.5rem;
    }
  }

  &__action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  &__qty {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1.5px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
  }

  &__qty-btn {
    width: 38px;
    height: 42px;
    border: none;
    background: rgb(var(--btn-gradient-light) / 0.5);
    font-size: 1.1rem;
    line-height: 1;
    color: var(--color-text);
    transition: background-color 0.15s ease;

    &:hover:not(:disabled) {
      background: rgb(var(--btn-gradient-mid) / 0.25);
    }

    &:disabled {
      opacity: 0.35;
    }
  }

  &__qty-val {
    font-size: var(--fs-base);
    font-weight: 600;
    min-width: 2rem;
    text-align: center;
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__btn {
    --btn-font-size: var(--fs-sm);
    flex: 1;
    text-align: center;
    white-space: nowrap;
    padding: 0.6rem 0.75rem;

    @include tablet {
      flex: 0 1 auto;
      padding: 0.6rem 1.5rem;
    }

    @include desktop {
      --btn-font-size: var(--fs-base);
      padding: 0.6rem 2rem;
    }

    &:disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }

  &__meta {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 1.25rem;

    @include tablet {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0.35rem 1.5rem;
    }
  }

  &__meta-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    letter-spacing: 0.04em;
    opacity: 0.85;

    svg {
      flex-shrink: 0;
      opacity: 0.55;
    }
  }

  &__divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin-bottom: 1rem;
  }

  &__desc {
    font-size: 0.88rem;
    line-height: 1.75;
    color: var(--color-text-muted);
    text-align: justify;

    @include desktop {
      font-size: var(--fs-md);
    }

    :deep(p) {
      margin: 0 0 0.875rem;
      &:last-child { margin-bottom: 0; }
    }

    :deep(ul),
    :deep(ol) {
      padding-left: 1.4em;
      margin: 0 0 0.875rem;
    }

    :deep(li) {
      margin-bottom: 0.25em;
    }

    :deep(strong) {
      font-weight: 700;
      color: var(--color-text);
    }

    :deep(em) {
      font-style: italic;
    }
  }
}
</style>
