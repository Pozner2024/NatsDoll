<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="contact-modal__overlay"
        @click.self="close"
        @keydown.escape="close"
      >
        <div
          class="contact-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-modal-title"
        >
          <button
            class="contact-modal__close"
            aria-label="Close"
            @click="close"
          >
            ×
          </button>

          <h2
            id="contact-modal-title"
            class="contact-modal__title"
          >
            Get in touch
          </h2>

          <div
            v-if="submitStatus === 'success'"
            class="contact-modal__success"
          >
            Message sent! I'll get back to you soon.
          </div>

          <form
            v-else
            class="contact-modal__form"
            novalidate
            @submit.prevent="handleSubmit"
          >
            <div class="contact-modal__field">
              <label
                class="contact-modal__label"
                for="contact-name"
              >Name</label>
              <input
                id="contact-name"
                v-model="form.name"
                class="contact-modal__input"
                :class="{ 'contact-modal__input--error': errors.name }"
                type="text"
                autocomplete="name"
              >
              <span
                v-if="errors.name"
                class="contact-modal__error"
              >{{ errors.name }}</span>
            </div>

            <div class="contact-modal__field">
              <label
                class="contact-modal__label"
                for="contact-email"
              >Email</label>
              <input
                id="contact-email"
                v-model="form.email"
                class="contact-modal__input"
                :class="{ 'contact-modal__input--error': errors.email }"
                type="email"
                autocomplete="email"
              >
              <span
                v-if="errors.email"
                class="contact-modal__error"
              >{{ errors.email }}</span>
            </div>

            <div class="contact-modal__field">
              <label
                class="contact-modal__label"
                for="contact-message"
              >Message</label>
              <textarea
                id="contact-message"
                v-model="form.message"
                class="contact-modal__textarea"
                :class="{ 'contact-modal__input--error': errors.message }"
                rows="4"
              />
              <span
                v-if="errors.message"
                class="contact-modal__error"
              >{{ errors.message }}</span>
            </div>

            <p
              v-if="submitStatus === 'error'"
              class="contact-modal__error contact-modal__error--global"
            >
              Something went wrong. Please try again.
            </p>

            <button
              class="contact-modal__submit"
              type="submit"
              :disabled="submitStatus === 'loading'"
            >
              {{ submitStatus === 'loading' ? 'Sending…' : 'Send message' }}
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useContactModal } from './useContactModal'

const { isOpen, submitStatus, close, submit } = useContactModal()

const form = reactive({ name: '', email: '', message: '' })
const errors = reactive({ name: '', email: '', message: '' })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(): boolean {
  errors.name = form.name.trim() ? '' : 'Name is required'
  errors.email = !form.email.trim()
    ? 'Email is required'
    : !EMAIL_RE.test(form.email)
      ? 'Invalid email'
      : ''
  errors.message = form.message.trim() ? '' : 'Message is required'
  return !errors.name && !errors.email && !errors.message
}

async function handleSubmit() {
  if (!validate()) return
  await submit({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() })
}
</script>

<style scoped lang="scss">
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.contact-modal {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  padding: 2rem 1.5rem;
  width: min(90vw, 480px);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  &__overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal, 1000);
  }

  &__close {
    position: absolute;
    top: 0.75rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--color-text-muted);

    &:hover {
      color: var(--color-text);
    }
  }

  &__title {
    font-family: var(--font-brand);
    font-size: var(--fs-section-heading);
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  &__label {
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text);
  }

  &__input,
  &__textarea {
    border: 1px solid var(--color-border);
    padding: 0.6rem 0.75rem;
    font-size: var(--fs-base);
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-white);
    resize: none;
    width: 100%;

    &:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: -1px;
    }

    &--error {
      border-color: #c0392b;
    }
  }

  &__error {
    font-size: var(--fs-xs);
    color: #c0392b;

    &--global {
      text-align: center;
    }
  }

  &__submit {
    align-self: center;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--fs-sm);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 0.6rem 2rem;
    background: none;
    border: 1px solid var(--color-text);
    color: var(--color-text);
    transition: background-color 0.2s ease;

    &:hover:not(:disabled) {
      background-color: rgb(var(--btn-gradient-mid) / 0.12);
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  &__success {
    text-align: center;
    font-size: var(--fs-base);
    color: var(--color-text-muted);
    padding: 1.5rem 0;
  }
}
</style>
