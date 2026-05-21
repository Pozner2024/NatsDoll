<template>
  <section class="account-profile">
    <div class="account-profile__header">
      <h2 class="account-profile__title">Profile</h2>
      <button v-if="!editing" class="account-profile__edit-btn" @click="editing = true">Edit</button>
      <button v-else class="account-profile__edit-btn account-profile__edit-btn--cancel" @click="cancelEdit">Cancel</button>
    </div>

    <div v-if="!editing" class="account-profile__view">
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
    </div>

    <form v-else class="account-profile__form" @submit.prevent="save">
      <div class="account-profile__field">
        <label class="account-profile__label">Name</label>
        <input
          v-model="name"
          class="account-profile__input"
          type="text"
          placeholder="Your name"
          required
        />
      </div>

      <div class="account-profile__field">
        <label class="account-profile__label">Email</label>
        <input
          class="account-profile__input account-profile__input--readonly"
          type="email"
          :value="user?.email"
          readonly
        />
        <p class="account-profile__hint">Email cannot be changed</p>
      </div>

      <div class="account-profile__field">
        <label class="account-profile__label">New password</label>
        <input
          v-model="password"
          class="account-profile__input"
          type="password"
          placeholder="Leave blank to keep current"
          autocomplete="new-password"
        />
      </div>

      <AppButton type="submit" class="account-profile__submit">
        Save changes
      </AppButton>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { AppButton } from '@/shared'
import { useAuthStore } from '@/entities/user'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const editing = ref(false)
const name = ref(user.value?.name ?? '')
const password = ref('')

function cancelEdit() {
  name.value = user.value?.name ?? ''
  password.value = ''
  editing.value = false
}

function save() {
  editing.value = false
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
  }

  &__hint {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  &__submit {
    align-self: flex-start;
    margin-top: 0.5rem;
  }
}
</style>
