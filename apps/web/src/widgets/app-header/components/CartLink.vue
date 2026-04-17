<template>
  <RouterLink
    to="/cart"
    class="cart-link"
    exact-active-class="cart-link--active"
    :aria-label="ariaLabel"
    @click="emit('navigate')"
  >
    <CartIcon class="cart-link__icon" />
    Cart
    <span
      v-if="cartCount > 0"
      class="cart-link__badge"
      aria-hidden="true"
    >{{ cartCount }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
// TODO: заменить ref(0) на useCartStore().count когда store будет готов
import CartIcon from './CartIcon.vue'

const emit = defineEmits<{
  navigate: []
}>()

// TODO: заменить на useCartStore().count
const cartCount = ref(0)

const ariaLabel = computed(() =>
  `Cart${cartCount.value > 0 ? `, ${cartCount.value} items` : ''}`
)
</script>

<style scoped lang="scss">
.cart-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-style: italic;
  color: var(--color-text);
  text-decoration: none;

  &__icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  &__badge {
    margin-left: auto;
    background: var(--color-text);
    color: var(--color-white);
    font-family: sans-serif;
    font-size: var(--fs-xs);
    font-weight: 400;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
}
</style>
