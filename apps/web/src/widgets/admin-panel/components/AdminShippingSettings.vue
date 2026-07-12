<template>
  <section class="shipping-settings">
    <h2 class="shipping-settings__title">
      Доставка
    </h2>

    <p
      v-if="loading"
      class="shipping-settings__status"
    >
      Загрузка…
    </p>

    <template v-else>
      <p class="shipping-settings__intro">
        Итоговая стоимость доставки = база + (кол-во товаров − 1) × доплата за товар.
      </p>

      <label class="shipping-settings__field">
        <span class="shipping-settings__label">Базовая стоимость (за первый товар), $</span>
        <input
          v-model.number="form.baseCost"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
        >
      </label>

      <label class="shipping-settings__field">
        <span class="shipping-settings__label">Доплата за каждый следующий товар, $</span>
        <input
          v-model.number="form.perExtraItemCost"
          type="number"
          min="0"
          step="0.01"
          inputmode="decimal"
        >
      </label>

      <button
        class="shipping-settings__save"
        type="button"
        :disabled="saving"
        @click="onSave"
      >
        {{ saving ? 'Сохранение…' : 'Сохранить' }}
      </button>

      <p
        v-if="error"
        class="shipping-settings__error"
      >
        {{ error }}
      </p>
      <p
        v-if="saved"
        class="shipping-settings__ok"
      >
        Сохранено
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { fetchShippingSettings, saveShippingSettings } from '../adminShippingApi'

const MAX_COST = 1000

const form = reactive({
  baseCost: 0,
  perExtraItemCost: 0,
})
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

function validate(): string | null {
  for (const value of [form.baseCost, form.perExtraItemCost]) {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'Введите числовые значения'
    if (value < 0) return 'Стоимость не может быть отрицательной'
    if (value > MAX_COST) return `Стоимость не может превышать ${MAX_COST}`
  }
  return null
}

onMounted(async () => {
  try {
    const s = await fetchShippingSettings()
    form.baseCost = s.baseCost
    form.perExtraItemCost = s.perExtraItemCost
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки'
  } finally {
    loading.value = false
  }
})

async function onSave() {
  error.value = ''
  saved.value = false
  const validationError = validate()
  if (validationError) {
    error.value = validationError
    return
  }
  saving.value = true
  try {
    const s = await saveShippingSettings({ baseCost: form.baseCost, perExtraItemCost: form.perExtraItemCost })
    form.baseCost = s.baseCost
    form.perExtraItemCost = s.perExtraItemCost
    saved.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.shipping-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;
  padding: 20px 16px;

  @include tablet {
    padding: 32px;
  }

  &__title {
    font-size: 1.3rem;
    margin: 0;
  }

  &__intro {
    font-size: 0.82rem;
    color: rgb(44 24 16 / 0.6);
    margin: 0;
  }

  &__status {
    color: rgb(44 24 16 / 0.6);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__label {
    font-size: 0.82rem;
    color: rgb(44 24 16 / 0.7);
  }

  &__field input {
    padding: 9px 10px;
    border: 1px solid rgb(44 24 16 / 0.2);
    border-radius: 6px;
    font: inherit;
  }

  &__save {
    align-self: flex-start;
    padding: 10px 22px;
    border: none;
    border-radius: 6px;
    background: var(--color-accent);
    color: var(--color-bg);
    font: inherit;

    &:disabled {
      opacity: 0.6;
    }
  }

  &__error {
    color: #c0392b;
  }

  &__ok {
    color: #2e7d32;
  }
}
</style>
