<template>
  <BaseModal
    :is-open="isOpen"
    labelled-by="cart-prompt-title"
    @close="close"
  >
    <div class="cart-prompt">
      <h2
        id="cart-prompt-title"
        class="cart-prompt__title"
      >
        Added to your cart
      </h2>
      <p class="cart-prompt__text">
        Would you like to go to your cart to check out, or keep browsing?
      </p>
      <div class="cart-prompt__actions">
        <AppButton
          type="button"
          class="cart-prompt__btn"
          @click="goToCart"
        >
          Go to cart
        </AppButton>
        <button
          type="button"
          class="cart-prompt__continue"
          @click="close"
        >
          Continue shopping
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { AppButton, BaseModal, useCartPrompt } from '@/shared'

const cartPrompt = useCartPrompt()
const { isOpen } = storeToRefs(cartPrompt)
const { close } = cartPrompt
const router = useRouter()

function goToCart() {
  close()
  router.push({ name: 'cart' })
}
</script>

<style scoped lang="scss">
.cart-prompt {
  padding: 3rem 1.5rem 2rem;
  width: min(90vw, 380px);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  text-align: center;

  &__title {
    font-family: var(--font-brand);
    font-size: var(--fs-section-heading);
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  &__text {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.6;
    margin: 0;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }

  &__btn {
    --btn-font-size: var(--fs-sm);
    padding: 0.6rem 2rem;
  }

  &__continue {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: var(--fs-sm);
    color: var(--color-accent);
    text-decoration: underline;
  }
}
</style>
