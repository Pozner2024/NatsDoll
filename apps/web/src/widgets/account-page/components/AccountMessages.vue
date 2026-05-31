<template>
  <section class="account-messages">
    <h2 class="account-messages__title">
      Messages
    </h2>

    <p
      v-if="loading && messages.length === 0"
      class="account-messages__status"
    >
      Loading…
    </p>

    <p
      v-else-if="store.error"
      class="account-messages__status account-messages__status--error"
    >
      {{ store.error }}
    </p>

    <template v-else>
      <div
        v-if="messages.length > 0"
        class="account-messages__list"
      >
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="account-messages__item"
        >
          <div class="account-messages__item-meta">
            <span
              v-if="msg.orderNumber"
              class="account-messages__item-order"
            >Re: Order #{{ msg.orderNumber }}</span>
            <span class="account-messages__item-date">{{ formatDate(msg.createdAt) }}</span>
          </div>
          <p class="account-messages__item-text">
            {{ msg.text }}
          </p>
        </div>
      </div>

      <div
        v-else
        class="account-messages__empty"
      >
        <p>No messages yet</p>
      </div>

      <form
        class="account-messages__form"
        @submit.prevent="handleSubmit"
      >
        <h3 class="account-messages__form-title">
          Send a message
        </h3>

        <div
          v-if="orders.length > 0"
          class="account-messages__field"
        >
          <label
            for="msg-order"
            class="account-messages__label"
          >Order <span class="account-messages__optional">(optional)</span></label>
          <select
            id="msg-order"
            v-model="selectedOrderId"
            class="account-messages__select"
          >
            <option value="">
              Not related to an order
            </option>
            <option
              v-for="order in orders"
              :key="order.id"
              :value="order.id"
            >
              Order #{{ order.orderNumber }} — {{ formatDate(order.createdAt) }}
            </option>
          </select>
        </div>

        <div class="account-messages__field">
          <label
            for="msg-text"
            class="account-messages__label"
          >Message</label>
          <textarea
            id="msg-text"
            v-model="text"
            class="account-messages__textarea"
            rows="4"
            placeholder="Write your message…"
            required
          />
        </div>

        <p
          v-if="formError"
          class="account-messages__hint account-messages__hint--error"
        >
          {{ formError }}
        </p>
        <p
          v-if="successMsg"
          class="account-messages__hint account-messages__hint--success"
        >
          {{ successMsg }}
        </p>

        <AppButton
          type="submit"
          :disabled="!text.trim() || sending"
        >
          {{ sending ? 'Sending…' : 'Send message' }}
        </AppButton>
      </form>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AppButton, formatDate } from '@/shared'
import { useMessageStore } from '@/entities/message'
import { useOrderStore } from '@/entities/order'

const store = useMessageStore()
const orderStore = useOrderStore()

const messages = computed(() => store.messages)
const loading = computed(() => store.loading)
const orders = computed(() => orderStore.myOrders)

const selectedOrderId = ref('')
const text = ref('')
const sending = ref(false)
const formError = ref('')
const successMsg = ref('')

async function handleSubmit() {
  formError.value = ''
  successMsg.value = ''
  sending.value = true
  try {
    await store.send({
      text: text.value.trim(),
      ...(selectedOrderId.value ? { orderId: selectedOrderId.value } : {}),
    })
    successMsg.value = 'Message sent!'
    text.value = ''
    selectedOrderId.value = ''
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  store.load()
  orderStore.loadMyOrders()
})
</script>

<style scoped lang="scss">
.account-messages {
  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 2rem;
    color: var(--color-text);
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
    margin-bottom: 2rem;
  }

  &__item {
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__item-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__item-order {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-accent);
  }

  &__item-date {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  &__item-text {
    font-size: 0.95rem;
    color: var(--color-text);
    line-height: 1.5;
  }

  &__empty {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);
    margin-bottom: 2rem;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 480px;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
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

  &__select {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__textarea {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;
    resize: vertical;
    min-height: 100px;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__hint {
    font-size: 0.8rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }

    &--success {
      color: #1a7a42;
    }
  }
}
</style>
