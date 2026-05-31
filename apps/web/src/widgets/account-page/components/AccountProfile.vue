<template>
  <section class="account-profile">
    <div class="account-profile__header">
      <h2 class="account-profile__title">
        Profile
      </h2>
      <button
        v-if="editing"
        class="account-profile__edit-btn account-profile__edit-btn--cancel"
        @click="cancelEdit"
      >
        Cancel
      </button>
    </div>

    <div
      v-if="!editing"
      class="account-profile__view"
    >
      <div class="account-profile__row">
        <span class="account-profile__row-label">Name</span>
        <span class="account-profile__row-value">{{ user?.name }}</span>
      </div>
      <div class="account-profile__row">
        <span class="account-profile__row-label">Email</span>
        <span class="account-profile__row-value">{{ user?.email }}</span>
      </div>
      <div class="account-profile__row">
        <span class="account-profile__row-label">Password</span>
        <span class="account-profile__row-value account-profile__row-value--muted">••••••••</span>
      </div>
      <button
        class="account-profile__edit-btn account-profile__edit-btn--below"
        @click="editing = true"
      >
        Edit
      </button>
    </div>

    <form
      v-else
      class="account-profile__form"
      @submit.prevent="save"
    >
      <div class="account-profile__field">
        <label class="account-profile__label">Name</label>
        <input
          v-model="name"
          class="account-profile__input"
          type="text"
          placeholder="Your name"
          required
        >
      </div>

      <div class="account-profile__field">
        <label class="account-profile__label">Email</label>
        <input
          class="account-profile__input account-profile__input--readonly"
          type="email"
          :value="user?.email"
          readonly
        >
        <p class="account-profile__hint">
          Email cannot be changed
        </p>
      </div>

      <div class="account-profile__field">
        <label class="account-profile__label">New password</label>
        <div class="account-profile__password">
          <input
            v-model="password"
            class="account-profile__input account-profile__input--password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Leave blank to keep current"
            autocomplete="new-password"
          >
          <button
            type="button"
            class="account-profile__password-toggle"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <IconEye
              :closed="!showPassword"
              class="account-profile__password-icon"
            />
          </button>
        </div>
      </div>

      <template v-if="password">
        <div class="account-profile__field">
          <label class="account-profile__label">Current password</label>
          <div class="account-profile__password">
            <input
              v-model="currentPassword"
              class="account-profile__input account-profile__input--password"
              :type="showCurrentPassword ? 'text' : 'password'"
              placeholder="Enter current password"
              autocomplete="current-password"
              required
            >
            <button
              type="button"
              class="account-profile__password-toggle"
              :aria-label="showCurrentPassword ? 'Hide password' : 'Show password'"
              @click="showCurrentPassword = !showCurrentPassword"
            >
              <IconEye
                :closed="!showCurrentPassword"
                class="account-profile__password-icon"
              />
            </button>
          </div>
        </div>

        <div class="account-profile__field">
          <label class="account-profile__label">Confirm new password</label>
          <div class="account-profile__password">
            <input
              v-model="passwordConfirm"
              class="account-profile__input account-profile__input--password"
              :type="showPasswordConfirm ? 'text' : 'password'"
              placeholder="Repeat new password"
              autocomplete="new-password"
            >
            <button
              type="button"
              class="account-profile__password-toggle"
              :aria-label="showPasswordConfirm ? 'Hide password' : 'Show password'"
              @click="showPasswordConfirm = !showPasswordConfirm"
            >
              <IconEye
                :closed="!showPasswordConfirm"
                class="account-profile__password-icon"
              />
            </button>
          </div>
          <p
            v-if="passwordMismatch"
            class="account-profile__hint account-profile__hint--error"
          >
            Passwords do not match
          </p>
        </div>
      </template>

      <p
        v-if="errorMsg"
        class="account-profile__hint account-profile__hint--error"
      >
        {{ errorMsg }}
      </p>
      <p
        v-if="successMsg"
        class="account-profile__hint account-profile__hint--success"
      >
        {{ successMsg }}
      </p>

      <AppButton
        type="submit"
        class="account-profile__submit"
        :disabled="passwordMismatch || saving || (password && !currentPassword)"
      >
        {{ saving ? 'Saving…' : 'Save changes' }}
      </AppButton>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AppButton, IconEye } from '@/shared'
import { useAuthStore } from '@/entities/user'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const editing = ref(false)
const name = ref(user.value?.name ?? '')
const password = ref('')
const passwordConfirm = ref('')
const currentPassword = ref('')
const showPassword = ref(false)
const showPasswordConfirm = ref(false)
const showCurrentPassword = ref(false)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const passwordMismatch = computed(
  () => password.value.length > 0 && passwordConfirm.value.length > 0 && password.value !== passwordConfirm.value,
)

function cancelEdit() {
  name.value = user.value?.name ?? ''
  password.value = ''
  passwordConfirm.value = ''
  currentPassword.value = ''
  showPassword.value = false
  showPasswordConfirm.value = false
  showCurrentPassword.value = false
  errorMsg.value = ''
  successMsg.value = ''
  editing.value = false
}

async function save() {
  if (passwordMismatch.value) return
  errorMsg.value = ''
  successMsg.value = ''
  saving.value = true
  try {
    const data: { name?: string; password?: string; currentPassword?: string } = {}
    if (name.value.trim() && name.value !== user.value?.name) data.name = name.value.trim()
    if (password.value) {
      data.password = password.value
      data.currentPassword = currentPassword.value
    }
    await authStore.updateProfile(data)
    successMsg.value = 'Profile updated successfully'
    password.value = ''
    passwordConfirm.value = ''
    currentPassword.value = ''
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.account-profile {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    color: var(--color-text);
  }

  &__edit-btn {
    font-size: 0.875rem;
    color: var(--color-accent);
    text-decoration: underline;
    background: none;
    border: none;
    font-family: var(--font-display);

    &--cancel {
      color: var(--color-text-muted);
    }

    &--below {
      align-self: flex-start;
      margin-top: 1rem;
    }
  }

  &__view {
    display: flex;
    flex-direction: column;
    gap: 0;
    max-width: 480px;
  }

  &__row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.9rem 0;
    border-bottom: 1px solid var(--color-border);

    &:first-child {
      border-top: 1px solid var(--color-border);
    }
  }

  &__row-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
    margin-right: 1rem;
  }

  &__row-value {
    font-size: 1rem;
    color: var(--color-text);
    text-align: right;

    &--muted {
      color: var(--color-text-muted);
      letter-spacing: 0.1em;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 480px;
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

  &__input {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;
    transition: border-color 0.15s;

    &:focus {
      border-color: var(--color-accent);
    }

    &--readonly {
      background: rgb(var(--btn-gradient-light) / 0.4);
      color: var(--color-text-muted);
    }

    &--password {
      width: 100%;
      padding-right: 2.75rem;
    }
  }

  &__password {
    position: relative;
    display: flex;
  }

  &__password-toggle {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    width: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--color-text-muted);
    transition: color 0.15s;

    &:hover:not(:disabled) {
      color: var(--color-text);
    }

    &:disabled {
      opacity: 0.4;
    }
  }

  &__password-icon {
    width: 20px;
    height: 20px;
  }

  &__hint {
    font-size: 0.78rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }

    &--success {
      color: #1a7a42;
    }
  }

  &__submit {
    align-self: flex-start;
    margin-top: 0.5rem;
  }
}
</style>
