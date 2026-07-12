<template>
  <BaseModal
    :is-open="isOpen"
    labelled-by="contact-modal-title"
    @close="close"
    @open="resetForm"
  >
    <div class="contact-modal">
      <h2
        id="contact-modal-title"
        class="contact-modal__title"
      >
        Get in touch
      </h2>

      <div
        v-if="submitStatus === 'success'"
        class="contact-modal__success"
        role="status"
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
            :aria-invalid="!!errors.name || undefined"
            :aria-describedby="errors.name ? 'contact-name-error' : undefined"
          >
          <span
            v-if="errors.name"
            id="contact-name-error"
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
            :aria-invalid="!!errors.email || undefined"
            :aria-describedby="errors.email ? 'contact-email-error' : undefined"
          >
          <span
            v-if="errors.email"
            id="contact-email-error"
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
            :aria-invalid="!!errors.message || undefined"
            :aria-describedby="errors.message ? 'contact-message-error' : undefined"
          />
          <span
            v-if="errors.message"
            id="contact-message-error"
            class="contact-modal__error"
          >{{ errors.message }}</span>
        </div>

        <p
          v-if="submitStatus === 'error'"
          class="contact-modal__error contact-modal__error--global"
          role="alert"
        >
          {{ errorMessage || 'Something went wrong. Please try again.' }}
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
  </BaseModal>
</template>

<script setup lang="ts">
import { reactive, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useContactModal } from './useContactModal'
import { BaseModal, validateEmail } from '@/shared'

const contactModal = useContactModal()
const { isOpen, submitStatus, errorMessage } = storeToRefs(contactModal)
const { close, submit } = contactModal

const form = reactive({ name: '', email: '', message: '' })
const errors = reactive({ name: '', email: '', message: '' })

function resetForm() {
  form.name = ''
  form.email = ''
  form.message = ''
  errors.name = ''
  errors.email = ''
  errors.message = ''
}

function validate(): boolean {
  errors.name = form.name.trim() ? '' : 'Please enter your name'
  errors.email = validateEmail(form.email)
  errors.message = form.message.trim() ? '' : 'Please enter your message'
  return !errors.name && !errors.email && !errors.message
}

async function focusFirstInvalid() {
  await nextTick()
  document.querySelector<HTMLElement>('.contact-modal [aria-invalid="true"]')?.focus()
}

async function handleSubmit() {
  if (!validate()) return focusFirstInvalid()
  await submit({ name: form.name.trim(), email: form.email.trim(), message: form.message.trim() })
}
</script>

<style scoped lang="scss">
@use '@/shared/lib/animated-border' as *;

.contact-modal {
  padding: 2rem 1.5rem;
  width: min(90vw, 480px);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

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
    @include animated-border;

    align-self: center;
    display: inline-block;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: var(--fs-sm);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 0.6rem 2rem;
    background: none;
    color: var(--color-text);
    transition: background-color 0.3s ease;

    &:hover:not(:disabled) {
      background-color: rgb(var(--btn-gradient-mid) / 0.12);
    }

    &:disabled {
      opacity: 0.5;
      animation: none;
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
