<template>
  <section class="payment-settings">
    <h2 class="payment-settings__title">
      Payments (PayPal)
    </h2>

    <p
      v-if="loading"
      class="payment-settings__status"
    >
      Загрузка…
    </p>

    <template v-else>
      <label class="payment-settings__row">
        <input
          v-model="form.enabled"
          type="checkbox"
        >
        <span>Включить приём оплаты</span>
      </label>

      <label class="payment-settings__field">
        <span class="payment-settings__label">Режим</span>
        <select v-model="form.mode">
          <option value="SANDBOX">Sandbox (тест)</option>
          <option value="LIVE">Live (боевой)</option>
        </select>
      </label>

      <label class="payment-settings__field">
        <span class="payment-settings__label">PayPal Client ID</span>
        <input
          v-model="form.clientId"
          type="text"
          autocomplete="off"
        >
      </label>

      <label class="payment-settings__field">
        <span class="payment-settings__label">PayPal Secret</span>
        <input
          v-model="secretInput"
          type="password"
          autocomplete="off"
          :placeholder="hasSecret ? 'Secret задан — оставьте пустым, чтобы не менять' : 'Оставьте пустым, если не используете'"
        >
        <small class="payment-settings__hint">
          {{ hasSecret ? 'Secret задан. Чтобы удалить — введите пробел и сохраните.' : 'С Secret оплата подтверждается автоматически; без него — вручную по сверке.' }}
        </small>
      </label>

      <button
        class="payment-settings__save"
        type="button"
        :disabled="saving"
        @click="onSave"
      >
        {{ saving ? 'Сохранение…' : 'Сохранить' }}
      </button>

      <p
        v-if="error"
        class="payment-settings__error"
      >
        {{ error }}
      </p>
      <p
        v-if="saved"
        class="payment-settings__ok"
      >
        Сохранено
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { fetchPaymentSettings, savePaymentSettings } from '../adminPaymentApi'

const form = reactive({ enabled: false, mode: 'SANDBOX' as 'SANDBOX' | 'LIVE', clientId: '' })
const secretInput = ref('')
const hasSecret = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

onMounted(async () => {
  try {
    const s = await fetchPaymentSettings()
    form.enabled = s.enabled
    form.mode = s.mode
    form.clientId = s.clientId ?? ''
    hasSecret.value = s.hasSecret
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка загрузки'
  } finally {
    loading.value = false
  }
})

async function onSave() {
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    const secret = secretInput.value === '' ? undefined : secretInput.value
    const s = await savePaymentSettings({
      enabled: form.enabled,
      mode: form.mode,
      clientId: form.clientId.trim() === '' ? null : form.clientId.trim(),
      secret,
    })
    hasSecret.value = s.hasSecret
    secretInput.value = ''
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

.payment-settings {
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

  &__status {
    color: rgb(44 24 16 / 0.6);
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 8px;
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

  &__field input,
  &__field select,
  .payment-settings__row select {
    padding: 9px 10px;
    border: 1px solid rgb(44 24 16 / 0.2);
    border-radius: 6px;
    font: inherit;
  }

  &__hint {
    font-size: 0.72rem;
    color: rgb(44 24 16 / 0.5);
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
