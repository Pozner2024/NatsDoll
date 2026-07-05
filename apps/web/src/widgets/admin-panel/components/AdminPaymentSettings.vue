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
        <span class="payment-settings__label">Активный режим</span>
        <select v-model="form.mode">
          <option value="SANDBOX">Sandbox (тест)</option>
          <option value="LIVE">Live (боевой)</option>
        </select>
        <small class="payment-settings__hint">
          Ключи Sandbox и Live хранятся раздельно — переключение режима не стирает ни один набор.
        </small>
      </label>

      <label class="payment-settings__row">
        <input
          v-model="form.externalPageEnabled"
          type="checkbox"
        >
        <span>Внешняя страница оплаты (WooCommerce)</span>
      </label>
      <small class="payment-settings__hint">
        Покупатель платит на pay.natsdoll.com. PayPal-ключи ниже в этом режиме не используются.
      </small>

      <fieldset
        v-for="m in modeSections"
        :key="m.key"
        class="payment-settings__section"
        :class="{ 'payment-settings__section--active': form.mode === m.mode }"
      >
        <legend class="payment-settings__section-title">
          {{ m.label }}
          <span
            v-if="form.mode === m.mode"
            class="payment-settings__badge"
          >активный</span>
        </legend>

        <label class="payment-settings__field">
          <span class="payment-settings__label">PayPal Client ID</span>
          <input
            v-model="form[m.key].clientId"
            type="text"
            autocomplete="off"
          >
        </label>

        <label class="payment-settings__field">
          <span class="payment-settings__label">PayPal Secret</span>
          <input
            v-model="form[m.key].secretInput"
            type="password"
            autocomplete="off"
            :disabled="form[m.key].clearSecret"
            :placeholder="form[m.key].hasSecret ? 'Secret задан — оставьте пустым, чтобы не менять' : 'Оставьте пустым, если не используете'"
          >
          <small class="payment-settings__hint">
            {{ form[m.key].hasSecret ? 'Secret задан. Оставьте поле пустым, чтобы не менять.' : 'С Secret оплата подтверждается автоматически; без него — вручную по сверке.' }}
          </small>
        </label>

        <label
          v-if="form[m.key].hasSecret"
          class="payment-settings__row"
        >
          <input
            v-model="form[m.key].clearSecret"
            type="checkbox"
          >
          <span>Удалить сохранённый Secret (перейти в ручной режим)</span>
        </label>

        <label class="payment-settings__field">
          <span class="payment-settings__label">PayPal Webhook ID</span>
          <input
            v-model="form[m.key].webhookId"
            type="text"
            autocomplete="off"
            placeholder="Из PayPal Dashboard → Webhooks"
          >
          <small class="payment-settings__hint">
            Подтверждает оплату, даже если покупатель закрыл вкладку после оплаты. Оставьте пустым, чтобы выключить.
          </small>
        </label>
      </fieldset>

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
import type { PaymentSettings, UpdateModeCredsBody } from '../adminPaymentApi'

type ModeForm = {
  clientId: string
  webhookId: string
  secretInput: string
  clearSecret: boolean
  hasSecret: boolean
}

const modeSections = [
  { key: 'sandbox', mode: 'SANDBOX', label: 'Sandbox (тест)' },
  { key: 'live', mode: 'LIVE', label: 'Live (боевой)' },
] as const

function emptyModeForm(): ModeForm {
  return { clientId: '', webhookId: '', secretInput: '', clearSecret: false, hasSecret: false }
}

const form = reactive({
  enabled: false,
  mode: 'SANDBOX' as 'SANDBOX' | 'LIVE',
  sandbox: emptyModeForm(),
  live: emptyModeForm(),
  externalPageEnabled: false,
})
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

function applySection(target: ModeForm, src: PaymentSettings['sandbox']): void {
  target.clientId = src.clientId ?? ''
  target.webhookId = src.webhookId ?? ''
  target.hasSecret = src.hasSecret
  target.secretInput = ''
  target.clearSecret = false
}

function credsBody(m: ModeForm): UpdateModeCredsBody {
  // null — очистить (ручной режим); undefined — не трогать; строка — заменить.
  let secret: string | null | undefined
  if (m.clearSecret) {
    secret = null
  } else if (m.secretInput === '') {
    secret = undefined
  } else {
    secret = m.secretInput
  }
  return {
    clientId: m.clientId.trim() === '' ? null : m.clientId.trim(),
    secret,
    webhookId: m.webhookId.trim() === '' ? null : m.webhookId.trim(),
  }
}

onMounted(async () => {
  try {
    const s = await fetchPaymentSettings()
    form.enabled = s.enabled
    form.mode = s.mode
    form.externalPageEnabled = s.externalPageEnabled
    applySection(form.sandbox, s.sandbox)
    applySection(form.live, s.live)
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
    const s = await savePaymentSettings({
      enabled: form.enabled,
      mode: form.mode,
      sandbox: credsBody(form.sandbox),
      live: credsBody(form.live),
      externalPageEnabled: form.externalPageEnabled,
    })
    form.externalPageEnabled = s.externalPageEnabled
    applySection(form.sandbox, s.sandbox)
    applySection(form.live, s.live)
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

  &__section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 0;
    padding: 14px 16px;
    border: 1px solid rgb(44 24 16 / 0.15);
    border-radius: 8px;

    &--active {
      border-color: var(--color-accent);
      background: rgb(44 24 16 / 0.03);
    }
  }

  &__section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 6px;
    font-size: 0.95rem;
    font-weight: 600;
  }

  &__badge {
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--color-accent);
    color: var(--color-bg);
    font-size: 0.68rem;
    font-weight: 500;
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
