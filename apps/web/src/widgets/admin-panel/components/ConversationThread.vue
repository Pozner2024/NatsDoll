<template>
  <div class="conv-thread">
    <div
      v-if="!thread"
      class="conv-thread__empty"
    >
      Select a conversation
    </div>

    <template v-else>
      <div class="conv-thread__header">
        <button
          class="conv-thread__back"
          @click="$emit('back')"
        >
          ←
        </button>
        <div class="conv-thread__user">
          <span class="conv-thread__user-name">{{ thread.userName }}</span>
          <span class="conv-thread__user-email">{{ thread.userEmail }}</span>
        </div>
      </div>

      <div
        ref="messagesEl"
        class="conv-thread__messages"
      >
        <div
          v-for="msg in thread.messages"
          :key="msg.id"
          class="conv-thread__bubble"
          :class="msg.fromAdmin ? 'conv-thread__bubble--admin' : 'conv-thread__bubble--user'"
        >
          <span
            v-if="msg.fromAdmin"
            class="conv-thread__sender"
          >NatsDoll</span>
          <span
            v-if="msg.orderNumber"
            class="conv-thread__order-tag"
          >Re: Order #{{ msg.orderNumber }}</span>
          <p class="conv-thread__text">
            {{ msg.text }}
          </p>
          <span class="conv-thread__time">{{ formatDate(msg.createdAt) }}</span>
        </div>
      </div>

      <form
        class="conv-thread__form"
        @submit.prevent="handleSubmit"
      >
        <div
          v-if="thread.userOrders.length > 0"
          class="conv-thread__field"
        >
          <label
            for="reply-order"
            class="conv-thread__label"
          >Order <span class="conv-thread__optional">(optional)</span></label>
          <select
            id="reply-order"
            v-model="selectedOrderId"
            class="conv-thread__select"
          >
            <option value="">
              Not related to an order
            </option>
            <option
              v-for="order in thread.userOrders"
              :key="order.id"
              :value="order.id"
            >
              Order #{{ order.orderNumber }} — {{ formatDate(order.createdAt) }}
            </option>
          </select>
        </div>

        <div class="conv-thread__field">
          <label
            for="reply-text"
            class="conv-thread__label"
          >Reply</label>
          <textarea
            id="reply-text"
            v-model="replyText"
            class="conv-thread__textarea"
            rows="3"
            placeholder="Write a reply…"
            required
          />
        </div>

        <p
          v-if="formError"
          class="conv-thread__error"
        >
          {{ formError }}
        </p>

        <AppButton
          type="submit"
          :disabled="!replyText.trim() || sending"
        >
          {{ sending ? 'Sending…' : 'Send reply' }}
        </AppButton>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { AppButton, formatDate } from '@/shared'
import type { ConversationDetail } from '../adminMessagesApi'

const props = defineProps<{
  thread: ConversationDetail | null
  sending: boolean
}>()

const emit = defineEmits<{
  reply: [payload: { text: string; orderId?: string }]
  back: []
}>()

const replyText = ref('')
const selectedOrderId = ref('')
const formError = ref('')
const messagesEl = ref<HTMLElement | null>(null)

watch(() => props.thread?.messages.length, async () => {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
})

function handleSubmit() {
  formError.value = ''
  emit('reply', {
    text: replyText.value.trim(),
    ...(selectedOrderId.value ? { orderId: selectedOrderId.value } : {}),
  })
}

function clearForm() {
  replyText.value = ''
  selectedOrderId.value = ''
  formError.value = ''
}

function setError(msg: string) {
  formError.value = msg
}

defineExpose({ clearForm, setError })
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.conv-thread {
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
    align-items: center;
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

    &:hover {
      background: var(--color-border);
    }

    @include tablet {
      display: none;
    }
  }

  &__user {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  &__user-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__user-email {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  &__messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__bubble {
    max-width: 75%;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;

    &--user {
      align-self: flex-start;
      background: var(--color-white);
      border: 1px solid var(--color-border);
      border-radius: 0 10px 10px 10px;
      padding: 0.6rem 0.875rem;
    }

    &--admin {
      align-self: flex-end;
      background: rgb(var(--btn-gradient-light) / 0.15);
      border: 1px solid rgb(var(--btn-gradient-light) / 0.3);
      border-radius: 10px 0 10px 10px;
      padding: 0.6rem 0.875rem;
    }
  }

  &__sender {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__order-tag {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-accent);
  }

  &__text {
    font-size: 0.88rem;
    color: var(--color-text);
    line-height: 1.5;
    white-space: pre-wrap;
  }

  &__time {
    font-size: 0.68rem;
    color: var(--color-text-muted);
    align-self: flex-end;
  }

  &__form {
    border-top: 1px solid var(--color-border);
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  &__label {
    font-size: 0.75rem;
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

  &__select,
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
    font-size: 0.8rem;
    color: var(--color-error);
  }
}
</style>
