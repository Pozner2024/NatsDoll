# Account Cabinet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать функционал четырёх разделов личного кабинета: Profile (редактирование), Purchases (список + деталь), Addresses (CRUD), Reviews (создание + список).

**Architecture:** Бэкенд — Hono + Clean Architecture (3 слоя: application / infrastructure / presentation), паттерн factory-функций, composition root в `app.ts`. Фронтенд — Vue 3 + Pinia + FSD: новые сущности в `entities/`, UI в существующих виджетах `widgets/account-page/components/`.

**Tech Stack:** Hono, Prisma, argon2, Zod (zod/v3 на бэке, zod на фронте), Vue 3, Pinia, authFetch/apiFetch.

---

## Карта файлов

### Task 1–2: Profile
- Modify: `apps/api/src/features/auth/infrastructure/authRepository.ts` — добавить `updateUser`
- Create: `apps/api/src/features/auth/application/updateProfile.ts`
- Modify: `apps/api/src/features/auth/presentation/authRoutes.ts` — добавить `PATCH /me`
- Modify: `apps/api/src/features/auth/index.ts` — экспорт
- Modify: `apps/api/src/app.ts` — wire up
- Modify: `apps/web/src/entities/user/store.ts` — `updateProfile` action
- Modify: `apps/web/src/widgets/account-page/components/AccountProfile.vue` — форма

### Task 3: Purchases
- Modify: `apps/web/src/widgets/account-page/components/AccountPurchases.vue`
- Create: `apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue`
- Modify: `apps/web/src/router/index.ts`

### Task 4–6: Addresses
- Modify: `apps/api/prisma/schema.prisma` — модель Address
- Create: `apps/api/src/features/addresses/types.ts`
- Create: `apps/api/src/features/addresses/infrastructure/addressRepository.ts`
- Create: `apps/api/src/features/addresses/application/getAddresses.ts`
- Create: `apps/api/src/features/addresses/application/createAddress.ts`
- Create: `apps/api/src/features/addresses/application/updateAddress.ts`
- Create: `apps/api/src/features/addresses/application/deleteAddress.ts`
- Create: `apps/api/src/features/addresses/application/setDefaultAddress.ts`
- Create: `apps/api/src/features/addresses/presentation/addressRoutes.ts`
- Create: `apps/api/src/features/addresses/index.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/web/src/entities/address/types.ts`
- Create: `apps/web/src/entities/address/addressApi.ts`
- Create: `apps/web/src/entities/address/store.ts`
- Create: `apps/web/src/entities/address/index.ts`
- Modify: `apps/web/src/widgets/account-page/components/AccountAddresses.vue`
- Modify: `apps/web/src/widgets/checkout-form/CheckoutForm.vue`

### Task 7–8: Reviews
- Create: `apps/api/src/features/reviews/types.ts`
- Create: `apps/api/src/features/reviews/infrastructure/reviewRepository.ts`
- Create: `apps/api/src/features/reviews/application/getMyReviews.ts`
- Create: `apps/api/src/features/reviews/application/getReviewableItems.ts`
- Create: `apps/api/src/features/reviews/application/createReview.ts`
- Create: `apps/api/src/features/reviews/presentation/reviewRoutes.ts`
- Create: `apps/api/src/features/reviews/index.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/web/src/entities/review/types.ts`
- Create: `apps/web/src/entities/review/reviewApi.ts`
- Create: `apps/web/src/entities/review/store.ts`
- Create: `apps/web/src/entities/review/index.ts`
- Modify: `apps/web/src/widgets/account-page/components/AccountReviews.vue`

---

## Task 1: Profile — Backend

**Files:**
- Modify: `apps/api/src/features/auth/infrastructure/authRepository.ts`
- Create: `apps/api/src/features/auth/application/updateProfile.ts`
- Modify: `apps/api/src/features/auth/presentation/authRoutes.ts`
- Modify: `apps/api/src/features/auth/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Шаг 1.1: Написать failing-тест для updateProfile**

Создать файл `apps/api/src/features/auth/application/updateProfile.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeUpdateProfile } from './updateProfile'
import { AppError } from '../../../shared/errors'

const mockUser = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  role: 'CUSTOMER' as const,
  passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$abc$def',
  googleId: null,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const repo = {
  findById: vi.fn(),
  updateUser: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('updateProfile', () => {
  it('updates name only', async () => {
    repo.findById.mockResolvedValue(mockUser)
    repo.updateUser.mockResolvedValue({ ...mockUser, name: 'Bob' })

    const updateProfile = makeUpdateProfile(repo as any)
    const result = await updateProfile('u1', { name: 'Bob' })

    expect(repo.updateUser).toHaveBeenCalledWith('u1', { name: 'Bob' })
    expect(result.name).toBe('Bob')
  })

  it('throws 400 when no fields provided', async () => {
    const updateProfile = makeUpdateProfile(repo as any)
    await expect(updateProfile('u1', {})).rejects.toThrow(AppError)
  })

  it('throws 400 when password provided without currentPassword', async () => {
    repo.findById.mockResolvedValue(mockUser)
    const updateProfile = makeUpdateProfile(repo as any)
    await expect(updateProfile('u1', { password: 'newpass' })).rejects.toThrow(AppError)
  })

  it('throws 401 when currentPassword is wrong', async () => {
    repo.findById.mockResolvedValue(mockUser)
    const updateProfile = makeUpdateProfile(repo as any)
    await expect(
      updateProfile('u1', { password: 'newpass', currentPassword: 'wrongpass' }),
    ).rejects.toThrow(AppError)
  })
})
```

- [ ] **Шаг 1.2: Запустить тест — убедиться, что падает**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/auth/application/updateProfile.test.ts --reporter=basic
```

Ожидаемо: FAIL — `Cannot find module './updateProfile'`

- [ ] **Шаг 1.3: Добавить `updateUser` в `AuthRepository`**

В `apps/api/src/features/auth/infrastructure/authRepository.ts` добавить в тип `AuthRepository` (после `deleteUser`):

```ts
updateUser(id: string, data: { name?: string; passwordHash?: string }): Promise<User>
```

И в реализацию `makeAuthRepository` (после `deleteUser`):

```ts
updateUser: (id, data) => prisma.user.update({ where: { id }, data }),
```

- [ ] **Шаг 1.4: Создать use-case updateProfile**

Создать `apps/api/src/features/auth/application/updateProfile.ts`:

```ts
import { verify, hash } from '@node-rs/argon2'
import type { AuthRepository } from '../infrastructure/authRepository'
import { AppError } from '../../../shared/errors'

type UpdateProfileData = {
  name?: string
  password?: string
  currentPassword?: string
}

type UpdateProfileResult = { id: string; name: string; email: string; role: string }

export function makeUpdateProfile(repo: Pick<AuthRepository, 'findById' | 'updateUser'>) {
  return async function updateProfile(userId: string, data: UpdateProfileData): Promise<UpdateProfileResult> {
    if (!data.name && !data.password) {
      throw new AppError(400, 'At least one field must be provided')
    }

    const user = await repo.findById(userId)
    if (!user) throw new AppError(404, 'User not found')

    const updates: { name?: string; passwordHash?: string } = {}

    if (data.name) {
      updates.name = data.name
    }

    if (data.password) {
      if (!data.currentPassword) {
        throw new AppError(400, 'Current password is required to change password')
      }
      if (!user.passwordHash) {
        throw new AppError(400, 'Password change is not available for Google accounts')
      }
      const isValid = await verify(user.passwordHash, data.currentPassword)
      if (!isValid) throw new AppError(401, 'Current password is incorrect')
      updates.passwordHash = await hash(data.password)
    }

    const updated = await repo.updateUser(userId, updates)
    return { id: updated.id, name: updated.name, email: updated.email, role: updated.role }
  }
}
```

- [ ] **Шаг 1.5: Запустить тест — убедиться, что проходит**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/auth/application/updateProfile.test.ts --reporter=basic
```

Ожидаемо: PASS (4 теста)

- [ ] **Шаг 1.6: Добавить `PATCH /me` в authRoutes**

В `apps/api/src/features/auth/presentation/authRoutes.ts`:

Добавить тип после `type GetMeFn`:
```ts
type UpdateProfileFn = (userId: string, data: { name?: string; password?: string; currentPassword?: string }) => Promise<{ id: string; name: string; email: string; role: string }>
```

Добавить параметр в `makeAuthRouter`:
```ts
export function makeAuthRouter(
  register: RegisterFn,
  login: LoginFn,
  refreshToken: RefreshTokenFn,
  logout: LogoutFn,
  getMe: GetMeFn,
  googleAuth: GoogleAuthFn,
  verifyEmail: VerifyEmailFn,
  updateProfile: UpdateProfileFn,
) {
```

Добавить схему после `loginSchema`:
```ts
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(4).max(128).optional(),
  currentPassword: z.string().min(1).optional(),
})
```

Добавить маршрут после `router.get('/me', ...)`:
```ts
router.patch('/me', requireAuth, zValidator('json', updateProfileSchema), async (c) => {
  const { userId } = c.get('auth')
  const data = c.req.valid('json')
  const user = await updateProfile(userId, data)
  return c.json({ user })
})
```

- [ ] **Шаг 1.7: Экспортировать из index.ts**

В `apps/api/src/features/auth/index.ts` добавить:
```ts
export { makeUpdateProfile } from './application/updateProfile'
```

- [ ] **Шаг 1.8: Подключить в app.ts**

В `apps/api/src/app.ts`:

В импорте из `./features/auth` добавить `makeUpdateProfile`:
```ts
import {
  makeAuthRepository,
  makeRegister,
  makeLogin,
  makeRefreshToken,
  makeLogout,
  makeGetMe,
  makeGoogleAuth,
  makeGetGoogleProfile,
  makeAuthRouter,
  makeVerifyEmail,
  makeEmailService,
  makeUpdateProfile,
} from './features/auth'
```

После `const verifyEmail = makeVerifyEmail(authRepo)` добавить:
```ts
const updateProfile = makeUpdateProfile(authRepo)
```

Обновить вызов `makeAuthRouter`:
```ts
app.route('/auth', makeAuthRouter(register, login, refreshToken, logout, getMe, googleAuth, verifyEmail, updateProfile))
```

- [ ] **Шаг 1.9: Проверить типы бэкенда**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

Ожидаемо: 0 ошибок

- [ ] **Шаг 1.10: Коммит**

```bash
git add apps/api/src/features/auth/
git commit -m "feat(api): add PATCH /auth/me for profile update"
```

---

## Task 2: Profile — Frontend

**Files:**
- Modify: `apps/web/src/entities/user/store.ts`
- Modify: `apps/web/src/widgets/account-page/components/AccountProfile.vue`

- [ ] **Шаг 2.1: Добавить `updateProfile` в authStore**

В `apps/web/src/entities/user/store.ts` добавить action перед `return`:

```ts
async function updateProfile(data: { name?: string; password?: string; currentPassword?: string }): Promise<void> {
  const res = await apiFetch('/auth/me', {
    method: 'PATCH',
    json: data,
    accessToken: accessToken.value ?? undefined,
  })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to update profile'))
  const body = z.object({ user: userSchema }).parse(await res.json())
  user.value = body.user
}
```

Добавить `updateProfile` в объект `return`.

- [ ] **Шаг 2.2: Обновить AccountProfile.vue**

Полностью заменить содержимое `apps/web/src/widgets/account-page/components/AccountProfile.vue`:

```vue
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
        :disabled="passwordMismatch || saving"
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
    if (name.value !== user.value?.name) data.name = name.value
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
```

- [ ] **Шаг 2.3: Проверить типы фронтенда**

```bash
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаемо: 0 ошибок

- [ ] **Шаг 2.4: Коммит**

```bash
git add apps/web/src/entities/user/store.ts apps/web/src/widgets/account-page/components/AccountProfile.vue
git commit -m "feat(web): wire up profile edit form with API"
```

---

## Task 3: Purchases — Frontend

**Files:**
- Modify: `apps/web/src/widgets/account-page/components/AccountPurchases.vue`
- Create: `apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue`
- Modify: `apps/web/src/router/index.ts`

- [ ] **Шаг 3.1: Обновить AccountPurchases.vue**

Полностью заменить содержимое `apps/web/src/widgets/account-page/components/AccountPurchases.vue`:

```vue
<template>
  <section class="account-purchases">
    <h2 class="account-purchases__title">
      Purchases
    </h2>

    <p
      v-if="loading && orders.length === 0"
      class="account-purchases__status"
    >
      Loading…
    </p>

    <p
      v-else-if="error"
      class="account-purchases__status account-purchases__status--error"
    >
      {{ error }}
    </p>

    <div
      v-else-if="orders.length === 0"
      class="account-purchases__empty"
    >
      <svg
        class="account-purchases__empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.4"
        aria-hidden="true"
      >
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 01-8 0" />
      </svg>
      <p>No orders yet</p>
      <RouterLink
        to="/shop"
        class="account-purchases__link"
      >
        Browse the shop
      </RouterLink>
    </div>

    <div
      v-else
      class="account-purchases__list"
    >
      <RouterLink
        v-for="order in orders"
        :key="order.id"
        :to="`/account/purchases/${order.id}`"
        class="account-purchases__card"
      >
        <div class="account-purchases__card-image">
          <img
            v-if="order.firstItemImage"
            :src="order.firstItemImage"
            :alt="'Order ' + order.id"
          >
          <span
            v-else
            class="account-purchases__card-image-placeholder"
          >?</span>
        </div>
        <div class="account-purchases__card-info">
          <p class="account-purchases__card-date">
            {{ formatDate(order.createdAt) }}
          </p>
          <p class="account-purchases__card-items">
            {{ order.itemCount }} {{ order.itemCount === 1 ? 'item' : 'items' }}
          </p>
          <p class="account-purchases__card-total">
            {{ formatPrice(order.totalAmount) }}
          </p>
        </div>
        <span
          class="account-purchases__card-status"
          :class="`account-purchases__card-status--${order.status.toLowerCase()}`"
        >
          {{ order.status }}
        </span>
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { formatPrice } from '@/shared'
import { useOrderStore } from '@/entities/order'

const orderStore = useOrderStore()
const orders = computed(() => orderStore.myOrders)
const loading = computed(() => orderStore.loading)
const error = computed(() => orderStore.error)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

onMounted(() => {
  orderStore.loadMyOrders()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.account-purchases {
  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 2rem;
    color: var(--color-text);
  }

  &__status {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  &__empty-icon {
    width: 48px;
    height: 48px;
    color: var(--color-border);
  }

  &__link {
    color: var(--color-accent);
    text-decoration: underline;
    font-size: 0.9rem;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-white);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    text-decoration: none;
    transition: border-color 0.15s;

    &:hover {
      border-color: var(--color-accent);
    }
  }

  &__card-image {
    width: 64px;
    height: 64px;
    border-radius: 6px;
    overflow: hidden;
    background: rgb(var(--btn-gradient-light) / 0.5);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__card-image-placeholder {
    font-size: 1.5rem;
    color: var(--color-border);
  }

  &__card-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__card-date {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  &__card-items {
    font-size: 0.9rem;
    color: var(--color-text);
  }

  &__card-total {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__card-status {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.3rem 0.65rem;
    border-radius: 20px;
    flex-shrink: 0;

    &--pending {
      background: rgb(212 160 23 / 0.15);
      color: var(--color-gold);
    }

    &--paid,
    &--processing,
    &--shipped {
      background: rgb(0 120 200 / 0.1);
      color: #0078c8;
    }

    &--delivered {
      background: rgb(39 174 96 / 0.12);
      color: #1a7a42;
    }

    &--cancelled,
    &--refunded {
      background: rgb(192 57 43 / 0.1);
      color: var(--color-error);
    }
  }
}
</style>
```

- [ ] **Шаг 3.2: Создать AccountPurchaseDetail.vue**

Создать `apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue`:

```vue
<template>
  <section class="purchase-detail">
    <RouterLink
      to="/account/purchases"
      class="purchase-detail__back"
    >
      ← Back to purchases
    </RouterLink>

    <p
      v-if="loading"
      class="purchase-detail__status"
    >
      Loading…
    </p>

    <p
      v-else-if="error"
      class="purchase-detail__status purchase-detail__status--error"
    >
      {{ error }}
    </p>

    <template v-else-if="order">
      <div class="purchase-detail__header">
        <div>
          <p class="purchase-detail__date">
            {{ formatDate(order.createdAt) }}
          </p>
          <p class="purchase-detail__id">
            Order #{{ order.id.slice(-8).toUpperCase() }}
          </p>
        </div>
        <span
          class="purchase-detail__status-badge"
          :class="`purchase-detail__status-badge--${order.status.toLowerCase()}`"
        >
          {{ order.status }}
        </span>
      </div>

      <div class="purchase-detail__items">
        <h3 class="purchase-detail__section-title">
          Items
        </h3>
        <div
          v-for="item in order.items"
          :key="item.id"
          class="purchase-detail__item"
        >
          <RouterLink
            :to="`/product/${item.productSlug}`"
            class="purchase-detail__item-image"
          >
            <img
              v-if="item.productImage"
              :src="item.productImage"
              :alt="item.productName"
            >
            <span
              v-else
              class="purchase-detail__item-image-placeholder"
            >?</span>
          </RouterLink>
          <div class="purchase-detail__item-info">
            <RouterLink
              :to="`/product/${item.productSlug}`"
              class="purchase-detail__item-name"
            >
              {{ item.productName }}
            </RouterLink>
            <p
              v-if="item.message"
              class="purchase-detail__item-message"
            >
              "{{ item.message }}"
            </p>
            <p class="purchase-detail__item-qty">
              Qty: {{ item.quantity }}
            </p>
          </div>
          <p class="purchase-detail__item-subtotal">
            {{ formatPrice(item.subtotal) }}
          </p>
        </div>
      </div>

      <div class="purchase-detail__footer">
        <div class="purchase-detail__address">
          <h3 class="purchase-detail__section-title">
            Shipping address
          </h3>
          <p>{{ order.shippingAddress.fullName }}</p>
          <p>{{ order.shippingAddress.line1 }}</p>
          <p v-if="order.shippingAddress.line2">
            {{ order.shippingAddress.line2 }}
          </p>
          <p>{{ order.shippingAddress.city }}, {{ order.shippingAddress.postalCode }}</p>
          <p>{{ order.shippingAddress.country }}</p>
        </div>

        <div class="purchase-detail__total">
          <span class="purchase-detail__total-label">Total</span>
          <span class="purchase-detail__total-value">{{ formatPrice(order.totalAmount) }}</span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { formatPrice } from '@/shared'
import { useOrderStore } from '@/entities/order'

const route = useRoute()
const orderStore = useOrderStore()

const order = computed(() => orderStore.currentOrder)
const loading = computed(() => orderStore.loading)
const error = computed(() => orderStore.error)

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

onMounted(() => {
  orderStore.loadOrder(route.params.id as string)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.purchase-detail {
  &__back {
    display: inline-block;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-decoration: none;
    margin-bottom: 1.5rem;

    &:hover {
      color: var(--color-text);
    }
  }

  &__status {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 2rem;
    gap: 1rem;
  }

  &__date {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-bottom: 0.2rem;
  }

  &__id {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__status-badge {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.3rem 0.65rem;
    border-radius: 20px;
    flex-shrink: 0;

    &--pending {
      background: rgb(212 160 23 / 0.15);
      color: var(--color-gold);
    }

    &--paid,
    &--processing,
    &--shipped {
      background: rgb(0 120 200 / 0.1);
      color: #0078c8;
    }

    &--delivered {
      background: rgb(39 174 96 / 0.12);
      color: #1a7a42;
    }

    &--cancelled,
    &--refunded {
      background: rgb(192 57 43 / 0.1);
      color: var(--color-error);
    }
  }

  &__section-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }

  &__items {
    margin-bottom: 2rem;
    border-top: 1px solid var(--color-border);
    padding-top: 1.5rem;
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  &__item-image {
    width: 72px;
    height: 72px;
    border-radius: 6px;
    overflow: hidden;
    background: rgb(var(--btn-gradient-light) / 0.5);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__item-image-placeholder {
    font-size: 1.5rem;
    color: var(--color-border);
  }

  &__item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__item-name {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text);
    text-decoration: none;

    &:hover {
      color: var(--color-accent);
    }
  }

  &__item-message {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__item-qty {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  &__item-subtotal {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
  }

  &__footer {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    @include tablet {
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
    }
  }

  &__address {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  &__total {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    flex-shrink: 0;
  }

  &__total-label {
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }

  &__total-value {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text);
  }
}
</style>
```

- [ ] **Шаг 3.3: Добавить маршрут в router/index.ts**

В `apps/web/src/router/index.ts` добавить дочерний маршрут внутри `/account` children (после `purchases`):

```ts
{
  path: 'purchases/:id',
  name: 'account-purchase-detail',
  component: () => import('@/widgets/account-page/components/AccountPurchaseDetail.vue'),
},
```

- [ ] **Шаг 3.4: Проверить типы**

```bash
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаемо: 0 ошибок

- [ ] **Шаг 3.5: Коммит**

```bash
git add apps/web/src/widgets/account-page/components/AccountPurchases.vue apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue apps/web/src/router/index.ts
git commit -m "feat(web): implement purchases list and detail page"
```

---

## Task 4: Address Model — Prisma Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Шаг 4.1: Добавить Address модель в schema.prisma**

В `apps/api/prisma/schema.prisma` добавить `addresses Address[]` в модель `User` (после `favorites Favorite[]`):

```prisma
  addresses          Address[]
```

После секции `Favorites` добавить новую секцию:

```prisma
// ─── Addresses ────────────────────────────────────────

model Address {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fullName   String
  line1      String
  line2      String?
  city       String
  country    String
  postalCode String
  isDefault  Boolean  @default(false)
  createdAt  DateTime @default(now())

  @@index([userId])
}
```

- [ ] **Шаг 4.2: Запустить миграцию**

```bash
cd apps/api && npx prisma migrate dev --name add-address-model
```

Ожидаемо: `Your database is now in sync with your schema.`

- [ ] **Шаг 4.3: Коммит**

```bash
git add apps/api/prisma/
git commit -m "feat(db): add Address model"
```

---

## Task 5: Addresses — Backend API

**Files:**
- Create: `apps/api/src/features/addresses/types.ts`
- Create: `apps/api/src/features/addresses/infrastructure/addressRepository.ts`
- Create: `apps/api/src/features/addresses/application/getAddresses.ts`
- Create: `apps/api/src/features/addresses/application/createAddress.ts`
- Create: `apps/api/src/features/addresses/application/updateAddress.ts`
- Create: `apps/api/src/features/addresses/application/deleteAddress.ts`
- Create: `apps/api/src/features/addresses/application/setDefaultAddress.ts`
- Create: `apps/api/src/features/addresses/presentation/addressRoutes.ts`
- Create: `apps/api/src/features/addresses/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Шаг 5.1: Написать failing-тест для createAddress**

Создать `apps/api/src/features/addresses/application/createAddress.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCreateAddress } from './createAddress'

const addressData = {
  fullName: 'Alice Smith',
  line1: '10 Main St',
  city: 'London',
  country: 'UK',
  postalCode: 'SW1A 1AA',
}

const repo = {
  findByUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  setDefault: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('createAddress', () => {
  it('creates address and returns it', async () => {
    const created = { id: 'a1', ...addressData, isDefault: true, createdAt: new Date().toISOString() }
    repo.create.mockResolvedValue(created)

    const createAddress = makeCreateAddress(repo as any)
    const result = await createAddress('u1', addressData)

    expect(repo.create).toHaveBeenCalledWith('u1', addressData)
    expect(result.id).toBe('a1')
  })
})
```

- [ ] **Шаг 5.2: Запустить тест — убедиться, что падает**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/addresses/ --reporter=basic
```

Ожидаемо: FAIL — `Cannot find module`

- [ ] **Шаг 5.3: Создать types.ts**

Создать `apps/api/src/features/addresses/types.ts`:

```ts
export type AddressData = {
  fullName: string
  line1: string
  line2?: string
  city: string
  country: string
  postalCode: string
}

export type AddressView = {
  id: string
  fullName: string
  line1: string
  line2?: string
  city: string
  country: string
  postalCode: string
  isDefault: boolean
  createdAt: string
}

export interface AddressRepository {
  findByUser(userId: string): Promise<AddressView[]>
  create(userId: string, data: AddressData): Promise<AddressView>
  update(id: string, userId: string, data: Partial<AddressData>): Promise<AddressView>
  delete(id: string, userId: string): Promise<void>
  setDefault(id: string, userId: string): Promise<void>
  countByUser(userId: string): Promise<number>
}

export type GetAddresses = (userId: string) => Promise<AddressView[]>
export type CreateAddress = (userId: string, data: AddressData) => Promise<AddressView>
export type UpdateAddress = (userId: string, addressId: string, data: Partial<AddressData>) => Promise<AddressView>
export type DeleteAddress = (userId: string, addressId: string) => Promise<void>
export type SetDefaultAddress = (userId: string, addressId: string) => Promise<void>
```

- [ ] **Шаг 5.4: Создать addressRepository.ts**

Создать `apps/api/src/features/addresses/infrastructure/addressRepository.ts`:

```ts
import type { PrismaClient } from '@prisma/client'
import { AppError } from '../../../shared/errors'
import type { AddressRepository, AddressData, AddressView } from '../types'

function toView(a: { id: string; fullName: string; line1: string; line2: string | null; city: string; country: string; postalCode: string; isDefault: boolean; createdAt: Date }): AddressView {
  return {
    id: a.id,
    fullName: a.fullName,
    line1: a.line1,
    line2: a.line2 ?? undefined,
    city: a.city,
    country: a.country,
    postalCode: a.postalCode,
    isDefault: a.isDefault,
    createdAt: a.createdAt.toISOString(),
  }
}

export function makeAddressRepository(prisma: PrismaClient): AddressRepository {
  return {
    async findByUser(userId) {
      const rows = await prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      })
      return rows.map(toView)
    },

    async create(userId, data) {
      const count = await prisma.address.count({ where: { userId } })
      const row = await prisma.address.create({
        data: { userId, ...data, isDefault: count === 0 },
      })
      return toView(row)
    },

    async update(id, userId, data) {
      const existing = await prisma.address.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) throw new AppError(404, 'Address not found')
      const row = await prisma.address.update({ where: { id }, data })
      return toView(row)
    },

    async delete(id, userId) {
      const existing = await prisma.address.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) throw new AppError(404, 'Address not found')
      await prisma.address.delete({ where: { id } })
      if (existing.isDefault) {
        const next = await prisma.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        })
        if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } })
      }
    },

    async setDefault(id, userId) {
      const existing = await prisma.address.findUnique({ where: { id } })
      if (!existing || existing.userId !== userId) throw new AppError(404, 'Address not found')
      await prisma.$transaction([
        prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
        prisma.address.update({ where: { id }, data: { isDefault: true } }),
      ])
    },

    countByUser: (userId) => prisma.address.count({ where: { userId } }),
  }
}
```

- [ ] **Шаг 5.5: Создать use-cases**

Создать `apps/api/src/features/addresses/application/getAddresses.ts`:

```ts
import type { AddressRepository, AddressView } from '../types'

export function makeGetAddresses(repo: AddressRepository) {
  return function getAddresses(userId: string): Promise<AddressView[]> {
    return repo.findByUser(userId)
  }
}
```

Создать `apps/api/src/features/addresses/application/createAddress.ts`:

```ts
import type { AddressRepository, AddressData, AddressView } from '../types'

export function makeCreateAddress(repo: AddressRepository) {
  return function createAddress(userId: string, data: AddressData): Promise<AddressView> {
    return repo.create(userId, data)
  }
}
```

Создать `apps/api/src/features/addresses/application/updateAddress.ts`:

```ts
import type { AddressRepository, AddressData, AddressView } from '../types'

export function makeUpdateAddress(repo: AddressRepository) {
  return function updateAddress(userId: string, addressId: string, data: Partial<AddressData>): Promise<AddressView> {
    return repo.update(addressId, userId, data)
  }
}
```

Создать `apps/api/src/features/addresses/application/deleteAddress.ts`:

```ts
import type { AddressRepository } from '../types'

export function makeDeleteAddress(repo: AddressRepository) {
  return async function deleteAddress(userId: string, addressId: string): Promise<void> {
    await repo.delete(addressId, userId)
  }
}
```

Создать `apps/api/src/features/addresses/application/setDefaultAddress.ts`:

```ts
import type { AddressRepository } from '../types'

export function makeSetDefaultAddress(repo: AddressRepository) {
  return async function setDefaultAddress(userId: string, addressId: string): Promise<void> {
    await repo.setDefault(addressId, userId)
  }
}
```

- [ ] **Шаг 5.6: Запустить тест — убедиться, что проходит**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/addresses/ --reporter=basic
```

Ожидаемо: PASS

- [ ] **Шаг 5.7: Создать addressRoutes.ts**

Создать `apps/api/src/features/addresses/presentation/addressRoutes.ts`:

```ts
import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '@hono/zod-validator'
import type { GetAddresses, CreateAddress, UpdateAddress, DeleteAddress, SetDefaultAddress } from '../types'

const addressSchema = z.object({
  fullName: z.string().min(1).max(200),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
})

const updateAddressSchema = addressSchema.partial()

export function makeAddressRouter(
  getAddresses: GetAddresses,
  createAddress: CreateAddress,
  updateAddress: UpdateAddress,
  deleteAddress: DeleteAddress,
  setDefaultAddress: SetDefaultAddress,
) {
  const router = new Hono()

  router.get('/', async (c) => {
    const { userId } = c.get('auth')
    const addresses = await getAddresses(userId)
    return c.json(addresses)
  })

  router.post('/', zValidator('json', addressSchema), async (c) => {
    const { userId } = c.get('auth')
    const data = c.req.valid('json')
    const address = await createAddress(userId, data)
    return c.json(address, 201)
  })

  router.patch('/:id', zValidator('json', updateAddressSchema), async (c) => {
    const { userId } = c.get('auth')
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const address = await updateAddress(userId, id, data)
    return c.json(address)
  })

  router.delete('/:id', async (c) => {
    const { userId } = c.get('auth')
    const id = c.req.param('id')
    await deleteAddress(userId, id)
    return c.body(null, 204)
  })

  router.post('/:id/default', async (c) => {
    const { userId } = c.get('auth')
    const id = c.req.param('id')
    await setDefaultAddress(userId, id)
    return c.body(null, 204)
  })

  return router
}
```

- [ ] **Шаг 5.8: Создать index.ts**

Создать `apps/api/src/features/addresses/index.ts`:

```ts
export { makeAddressRepository } from './infrastructure/addressRepository'
export { makeGetAddresses } from './application/getAddresses'
export { makeCreateAddress } from './application/createAddress'
export { makeUpdateAddress } from './application/updateAddress'
export { makeDeleteAddress } from './application/deleteAddress'
export { makeSetDefaultAddress } from './application/setDefaultAddress'
export { makeAddressRouter } from './presentation/addressRoutes'
```

- [ ] **Шаг 5.9: Подключить в app.ts**

В `apps/api/src/app.ts` добавить импорт:

```ts
import {
  makeAddressRepository,
  makeGetAddresses,
  makeCreateAddress,
  makeUpdateAddress,
  makeDeleteAddress,
  makeSetDefaultAddress,
  makeAddressRouter,
} from './features/addresses'
```

Добавить блок в конце `createApp()` перед `return app`:

```ts
  // Addresses
  const addressRepo = makeAddressRepository(prisma)
  const getAddresses = makeGetAddresses(addressRepo)
  const createAddress = makeCreateAddress(addressRepo)
  const updateAddress = makeUpdateAddress(addressRepo)
  const deleteAddress = makeDeleteAddress(addressRepo)
  const setDefaultAddress = makeSetDefaultAddress(addressRepo)
  app.use('/me/addresses', requireAuth)
  app.use('/me/addresses/*', requireAuth)
  app.route('/me/addresses', makeAddressRouter(getAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress))
```

- [ ] **Шаг 5.10: Проверить типы бэкенда**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

Ожидаемо: 0 ошибок

- [ ] **Шаг 5.11: Коммит**

```bash
git add apps/api/src/features/addresses/ apps/api/src/app.ts
git commit -m "feat(api): add addresses CRUD endpoints"
```

---

## Task 6: Addresses — Frontend

**Files:**
- Create: `apps/web/src/entities/address/types.ts`
- Create: `apps/web/src/entities/address/addressApi.ts`
- Create: `apps/web/src/entities/address/store.ts`
- Create: `apps/web/src/entities/address/index.ts`
- Modify: `apps/web/src/widgets/account-page/components/AccountAddresses.vue`
- Modify: `apps/web/src/widgets/checkout-form/CheckoutForm.vue`

- [ ] **Шаг 6.1: Создать entities/address/types.ts**

```ts
export type AddressData = {
  fullName: string
  line1: string
  line2?: string
  city: string
  country: string
  postalCode: string
}

export type Address = AddressData & {
  id: string
  isDefault: boolean
  createdAt: string
}
```

- [ ] **Шаг 6.2: Создать entities/address/addressApi.ts**

```ts
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'
import type { Address, AddressData } from './types'

const addressSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  country: z.string(),
  postalCode: z.string(),
  isDefault: z.boolean(),
  createdAt: z.string(),
})

export async function fetchAddresses(): Promise<Address[]> {
  const res = await authFetch('/me/addresses')
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load addresses'))
  return z.array(addressSchema).parse(await res.json())
}

export async function createAddress(data: AddressData): Promise<Address> {
  const res = await authFetch('/me/addresses', { method: 'POST', json: data })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to create address'))
  return addressSchema.parse(await res.json())
}

export async function updateAddress(id: string, data: Partial<AddressData>): Promise<Address> {
  const res = await authFetch(`/me/addresses/${id}`, { method: 'PATCH', json: data })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to update address'))
  return addressSchema.parse(await res.json())
}

export async function deleteAddress(id: string): Promise<void> {
  const res = await authFetch(`/me/addresses/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to delete address'))
}

export async function setDefaultAddress(id: string): Promise<void> {
  const res = await authFetch(`/me/addresses/${id}/default`, { method: 'POST' })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to update default address'))
}
```

- [ ] **Шаг 6.3: Создать entities/address/store.ts**

```ts
import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Address, AddressData } from './types'
import { fetchAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from './addressApi'

export const useAddressStore = defineStore('address', () => {
  const addresses = ref<Address[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const defaultAddress = computed(() => addresses.value.find(a => a.isDefault) ?? null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      addresses.value = await fetchAddresses()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load addresses'
    } finally {
      loading.value = false
    }
  }

  async function add(data: AddressData): Promise<void> {
    const created = await createAddress(data)
    addresses.value = [...addresses.value, created]
    if (created.isDefault) {
      addresses.value = addresses.value.map(a => ({ ...a, isDefault: a.id === created.id }))
    }
    await load()
  }

  async function update(id: string, data: Partial<AddressData>): Promise<void> {
    await updateAddress(id, data)
    await load()
  }

  async function remove(id: string): Promise<void> {
    await deleteAddress(id)
    await load()
  }

  async function setDefault(id: string): Promise<void> {
    await setDefaultAddress(id)
    await load()
  }

  return {
    addresses: readonly(addresses),
    loading: readonly(loading),
    error: readonly(error),
    defaultAddress,
    load,
    add,
    update,
    remove,
    setDefault,
  }
})
```

- [ ] **Шаг 6.4: Создать entities/address/index.ts**

```ts
export { useAddressStore } from './store'
export type { Address, AddressData } from './types'
```

- [ ] **Шаг 6.5: Обновить AccountAddresses.vue**

Полностью заменить содержимое `apps/web/src/widgets/account-page/components/AccountAddresses.vue`:

```vue
<template>
  <section class="account-addresses">
    <div class="account-addresses__header">
      <h2 class="account-addresses__title">
        Addresses
      </h2>
      <button
        v-if="!showForm"
        class="account-addresses__add-btn"
        @click="openAdd"
      >
        + Add address
      </button>
    </div>

    <p
      v-if="loading && addresses.length === 0"
      class="account-addresses__status"
    >
      Loading…
    </p>

    <p
      v-else-if="store.error"
      class="account-addresses__status account-addresses__status--error"
    >
      {{ store.error }}
    </p>

    <template v-else>
      <div
        v-if="addresses.length > 0"
        class="account-addresses__list"
      >
        <div
          v-for="address in addresses"
          :key="address.id"
          class="account-addresses__card"
          :class="{ 'account-addresses__card--default': address.isDefault }"
        >
          <div class="account-addresses__card-body">
            <p class="account-addresses__card-name">
              {{ address.fullName }}
            </p>
            <p>{{ address.line1 }}</p>
            <p v-if="address.line2">
              {{ address.line2 }}
            </p>
            <p>{{ address.city }}, {{ address.postalCode }}</p>
            <p>{{ address.country }}</p>
            <span
              v-if="address.isDefault"
              class="account-addresses__default-badge"
            >Default</span>
          </div>
          <div class="account-addresses__card-actions">
            <button
              class="account-addresses__action-btn"
              @click="openEdit(address)"
            >
              Edit
            </button>
            <button
              v-if="!address.isDefault"
              class="account-addresses__action-btn"
              @click="store.setDefault(address.id)"
            >
              Set default
            </button>
            <button
              class="account-addresses__action-btn account-addresses__action-btn--danger"
              @click="store.remove(address.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div
        v-else-if="!showForm"
        class="account-addresses__empty"
      >
        <svg
          class="account-addresses__empty-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          aria-hidden="true"
        >
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <p>No saved addresses</p>
        <p class="account-addresses__hint">
          Saved addresses will be pre-filled at checkout
        </p>
      </div>

      <form
        v-if="showForm"
        class="account-addresses__form"
        @submit.prevent="submitForm"
      >
        <h3 class="account-addresses__form-title">
          {{ editingId ? 'Edit address' : 'New address' }}
        </h3>

        <div class="account-addresses__field">
          <label class="account-addresses__label">Full name</label>
          <input v-model="form.fullName" class="account-addresses__input" type="text" required>
        </div>
        <div class="account-addresses__field">
          <label class="account-addresses__label">Address line 1</label>
          <input v-model="form.line1" class="account-addresses__input" type="text" required>
        </div>
        <div class="account-addresses__field">
          <label class="account-addresses__label">Address line 2 <span class="account-addresses__optional">(optional)</span></label>
          <input v-model="form.line2" class="account-addresses__input" type="text">
        </div>
        <div class="account-addresses__row">
          <div class="account-addresses__field">
            <label class="account-addresses__label">City</label>
            <input v-model="form.city" class="account-addresses__input" type="text" required>
          </div>
          <div class="account-addresses__field">
            <label class="account-addresses__label">Postal code</label>
            <input v-model="form.postalCode" class="account-addresses__input" type="text" required>
          </div>
        </div>
        <div class="account-addresses__field">
          <label class="account-addresses__label">Country</label>
          <input v-model="form.country" class="account-addresses__input" type="text" required>
        </div>

        <p v-if="formError" class="account-addresses__hint account-addresses__hint--error">
          {{ formError }}
        </p>

        <div class="account-addresses__form-actions">
          <AppButton type="submit" :disabled="formSaving">
            {{ formSaving ? 'Saving…' : (editingId ? 'Save changes' : 'Add address') }}
          </AppButton>
          <button type="button" class="account-addresses__cancel-btn" @click="closeForm">
            Cancel
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { AppButton } from '@/shared'
import { useAddressStore } from '@/entities/address'
import type { Address } from '@/entities/address'

const store = useAddressStore()
const addresses = computed(() => store.addresses)
const loading = computed(() => store.loading)

const showForm = ref(false)
const editingId = ref<string | null>(null)
const formSaving = ref(false)
const formError = ref('')

const form = reactive({
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  country: '',
  postalCode: '',
})

function openAdd() {
  editingId.value = null
  form.fullName = ''
  form.line1 = ''
  form.line2 = ''
  form.city = ''
  form.country = ''
  form.postalCode = ''
  formError.value = ''
  showForm.value = true
}

function openEdit(address: Address) {
  editingId.value = address.id
  form.fullName = address.fullName
  form.line1 = address.line1
  form.line2 = address.line2 ?? ''
  form.city = address.city
  form.country = address.country
  form.postalCode = address.postalCode
  formError.value = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  formError.value = ''
}

async function submitForm() {
  formError.value = ''
  formSaving.value = true
  try {
    const data = {
      fullName: form.fullName,
      line1: form.line1,
      city: form.city,
      country: form.country,
      postalCode: form.postalCode,
      ...(form.line2.trim() ? { line2: form.line2 } : {}),
    }
    if (editingId.value) {
      await store.update(editingId.value, data)
    } else {
      await store.add(data)
    }
    closeForm()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    formSaving.value = false
  }
}

onMounted(() => {
  store.load()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.account-addresses {
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

  &__add-btn {
    font-size: 0.875rem;
    color: var(--color-accent);
    text-decoration: underline;
    background: none;
    border: none;
    font-family: var(--font-display);
  }

  &__status {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  &__card {
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    font-size: 0.9rem;
    color: var(--color-text);
    line-height: 1.5;

    @include tablet {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
    }

    &--default {
      border-color: var(--color-accent);
    }
  }

  &__card-name {
    font-weight: 600;
  }

  &__default-badge {
    display: inline-block;
    margin-top: 0.4rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    background: rgb(var(--btn-gradient-light) / 0.7);
    color: var(--color-accent);
  }

  &__card-actions {
    display: flex;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__action-btn {
    font-size: 0.8rem;
    color: var(--color-accent);
    text-decoration: underline;
    background: none;
    border: none;
    font-family: var(--font-display);

    &--danger {
      color: var(--color-error);
    }
  }

  &__empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  &__empty-icon {
    width: 48px;
    height: 48px;
    color: var(--color-border);
  }

  &__hint {
    font-size: 0.8rem;

    &--error {
      color: var(--color-error);
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 480px;
    padding: 1.5rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    margin-top: 1rem;
  }

  &__form-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
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

  &__optional {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
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
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  &__form-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__cancel-btn {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-decoration: underline;
    background: none;
    border: none;
    font-family: var(--font-display);
  }
}
</style>
```

- [ ] **Шаг 6.6: Добавить автозаполнение в CheckoutForm.vue**

В `apps/web/src/widgets/checkout-form/CheckoutForm.vue` в `<script setup>` добавить импорт и вызов:

Добавить импорт после существующих:
```ts
import { useAddressStore } from '@/entities/address'
```

Добавить после `const orderStore = useOrderStore()`:
```ts
const addressStore = useAddressStore()
```

Добавить `onMounted` после объявления `form`:
```ts
import { reactive, ref, onMounted } from 'vue'
```

Заменить `import { reactive, ref } from 'vue'` на `import { reactive, ref, onMounted } from 'vue'`, затем добавить:
```ts
onMounted(async () => {
  await addressStore.load()
  const def = addressStore.defaultAddress
  if (def) {
    form.fullName = def.fullName
    form.line1 = def.line1
    form.line2 = def.line2 ?? ''
    form.city = def.city
    form.country = def.country
    form.postalCode = def.postalCode
  }
})
```

- [ ] **Шаг 6.7: Проверить типы фронтенда**

```bash
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаемо: 0 ошибок

- [ ] **Шаг 6.8: Коммит**

```bash
git add apps/web/src/entities/address/ apps/web/src/widgets/account-page/components/AccountAddresses.vue apps/web/src/widgets/checkout-form/CheckoutForm.vue
git commit -m "feat(web): implement addresses UI with checkout pre-fill"
```

---

## Task 7: Reviews — Backend API

> Модель `Review` уже есть в `schema.prisma`. Миграция не нужна.
> Поле называется `comment` (не `text`). Финальный статус заказа — `DELIVERED`.

**Files:**
- Create: `apps/api/src/features/reviews/types.ts`
- Create: `apps/api/src/features/reviews/infrastructure/reviewRepository.ts`
- Create: `apps/api/src/features/reviews/application/getMyReviews.ts`
- Create: `apps/api/src/features/reviews/application/getReviewableItems.ts`
- Create: `apps/api/src/features/reviews/application/createReview.ts`
- Create: `apps/api/src/features/reviews/presentation/reviewRoutes.ts`
- Create: `apps/api/src/features/reviews/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Шаг 7.1: Написать failing-тест для createReview**

Создать `apps/api/src/features/reviews/application/createReview.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCreateReview } from './createReview'
import { AppError } from '../../../shared/errors'

const repo = {
  findMyReviews: vi.fn(),
  findReviewableItems: vi.fn(),
  create: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

describe('createReview', () => {
  it('creates review for delivered order item', async () => {
    repo.findReviewableItems.mockResolvedValue([
      { productId: 'p1', orderId: 'o1', productName: 'Ring', productImage: null },
    ])
    repo.create.mockResolvedValue({
      id: 'r1', productId: 'p1', productName: 'Ring', productImage: null,
      orderId: 'o1', rating: 5, comment: null, createdAt: new Date().toISOString(),
    })

    const createReview = makeCreateReview(repo as any)
    const result = await createReview('u1', { productId: 'p1', orderId: 'o1', rating: 5 })

    expect(repo.create).toHaveBeenCalledWith('u1', { productId: 'p1', orderId: 'o1', rating: 5, comment: undefined })
    expect(result.id).toBe('r1')
  })

  it('throws 400 if product/order not in reviewable items', async () => {
    repo.findReviewableItems.mockResolvedValue([])

    const createReview = makeCreateReview(repo as any)
    await expect(
      createReview('u1', { productId: 'p1', orderId: 'o1', rating: 5 }),
    ).rejects.toThrow(AppError)
  })

  it('throws 400 if rating out of range', async () => {
    const createReview = makeCreateReview(repo as any)
    await expect(
      createReview('u1', { productId: 'p1', orderId: 'o1', rating: 6 }),
    ).rejects.toThrow(AppError)
  })
})
```

- [ ] **Шаг 7.2: Запустить тест — убедиться, что падает**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/reviews/ --reporter=basic
```

Ожидаемо: FAIL — `Cannot find module`

- [ ] **Шаг 7.3: Создать types.ts**

Создать `apps/api/src/features/reviews/types.ts`:

```ts
export type ReviewView = {
  id: string
  productId: string
  productName: string
  productImage: string | null
  orderId: string | null
  rating: number
  comment: string | null
  createdAt: string
}

export type ReviewableItem = {
  productId: string
  productName: string
  productImage: string | null
  orderId: string
}

export type CreateReviewData = {
  productId: string
  orderId: string
  rating: number
  comment?: string
}

export interface ReviewRepository {
  findMyReviews(userId: string): Promise<ReviewView[]>
  findReviewableItems(userId: string): Promise<ReviewableItem[]>
  create(userId: string, data: CreateReviewData): Promise<ReviewView>
}

export type GetMyReviews = (userId: string) => Promise<ReviewView[]>
export type GetReviewableItems = (userId: string) => Promise<ReviewableItem[]>
export type CreateReview = (userId: string, data: CreateReviewData) => Promise<ReviewView>
```

- [ ] **Шаг 7.4: Создать reviewRepository.ts**

Создать `apps/api/src/features/reviews/infrastructure/reviewRepository.ts`:

```ts
import type { PrismaClient } from '@prisma/client'
import type { ReviewRepository, ReviewView, ReviewableItem, CreateReviewData } from '../types'

export function makeReviewRepository(prisma: PrismaClient): ReviewRepository {
  return {
    async findMyReviews(userId) {
      const rows = await prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, images: true } },
        },
      })
      return rows.map((r): ReviewView => ({
        id: r.id,
        productId: r.productId,
        productName: r.product.name,
        productImage: r.product.images[0] ?? null,
        orderId: r.orderId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      }))
    },

    async findReviewableItems(userId) {
      const orders = await prisma.order.findMany({
        where: { userId, status: 'DELIVERED' },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
          },
        },
      })

      const reviewed = await prisma.review.findMany({
        where: { userId },
        select: { productId: true },
      })
      const reviewedIds = new Set(reviewed.map(r => r.productId))

      const items: ReviewableItem[] = []
      for (const order of orders) {
        for (const item of order.items) {
          if (!reviewedIds.has(item.productId)) {
            items.push({
              productId: item.productId,
              productName: item.product.name,
              productImage: item.product.images[0] ?? null,
              orderId: order.id,
            })
          }
        }
      }
      return items
    },

    async create(userId, data) {
      const row = await prisma.review.create({
        data: {
          userId,
          productId: data.productId,
          orderId: data.orderId,
          rating: data.rating,
          comment: data.comment ?? null,
        },
        include: {
          product: { select: { name: true, images: true } },
        },
      })
      return {
        id: row.id,
        productId: row.productId,
        productName: row.product.name,
        productImage: row.product.images[0] ?? null,
        orderId: row.orderId,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.createdAt.toISOString(),
      }
    },
  }
}
```

- [ ] **Шаг 7.5: Создать use-cases**

Создать `apps/api/src/features/reviews/application/getMyReviews.ts`:

```ts
import type { ReviewRepository, ReviewView } from '../types'

export function makeGetMyReviews(repo: ReviewRepository) {
  return function getMyReviews(userId: string): Promise<ReviewView[]> {
    return repo.findMyReviews(userId)
  }
}
```

Создать `apps/api/src/features/reviews/application/getReviewableItems.ts`:

```ts
import type { ReviewRepository, ReviewableItem } from '../types'

export function makeGetReviewableItems(repo: ReviewRepository) {
  return function getReviewableItems(userId: string): Promise<ReviewableItem[]> {
    return repo.findReviewableItems(userId)
  }
}
```

Создать `apps/api/src/features/reviews/application/createReview.ts`:

```ts
import type { ReviewRepository, CreateReviewData, ReviewView } from '../types'
import { AppError } from '../../../shared/errors'

export function makeCreateReview(repo: ReviewRepository) {
  return async function createReview(userId: string, data: CreateReviewData): Promise<ReviewView> {
    if (data.rating < 1 || data.rating > 5) {
      throw new AppError(400, 'Rating must be between 1 and 5')
    }

    const reviewable = await repo.findReviewableItems(userId)
    const isAllowed = reviewable.some(
      item => item.productId === data.productId && item.orderId === data.orderId,
    )
    if (!isAllowed) {
      throw new AppError(400, 'You can only review items from your delivered orders, and cannot review the same product twice')
    }

    return repo.create(userId, data)
  }
}
```

- [ ] **Шаг 7.6: Запустить тест — убедиться, что проходит**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/reviews/ --reporter=basic
```

Ожидаемо: PASS

- [ ] **Шаг 7.7: Создать reviewRoutes.ts**

Создать `apps/api/src/features/reviews/presentation/reviewRoutes.ts`:

```ts
import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '@hono/zod-validator'
import type { GetMyReviews, GetReviewableItems, CreateReview } from '../types'

const createReviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
})

export function makeReviewRouter(
  getMyReviews: GetMyReviews,
  getReviewableItems: GetReviewableItems,
  createReview: CreateReview,
) {
  const router = new Hono()

  router.get('/', async (c) => {
    const { userId } = c.get('auth')
    const reviews = await getMyReviews(userId)
    return c.json(reviews)
  })

  router.get('/reviewable', async (c) => {
    const { userId } = c.get('auth')
    const items = await getReviewableItems(userId)
    return c.json(items)
  })

  router.post('/', zValidator('json', createReviewSchema), async (c) => {
    const { userId } = c.get('auth')
    const data = c.req.valid('json')
    const review = await createReview(userId, data)
    return c.json(review, 201)
  })

  return router
}
```

- [ ] **Шаг 7.8: Создать index.ts**

Создать `apps/api/src/features/reviews/index.ts`:

```ts
export { makeReviewRepository } from './infrastructure/reviewRepository'
export { makeGetMyReviews } from './application/getMyReviews'
export { makeGetReviewableItems } from './application/getReviewableItems'
export { makeCreateReview } from './application/createReview'
export { makeReviewRouter } from './presentation/reviewRoutes'
```

- [ ] **Шаг 7.9: Подключить в app.ts**

В `apps/api/src/app.ts` добавить импорт:

```ts
import {
  makeReviewRepository,
  makeGetMyReviews,
  makeGetReviewableItems,
  makeCreateReview,
  makeReviewRouter,
} from './features/reviews'
```

Добавить блок перед `return app`:

```ts
  // Reviews
  const reviewRepo = makeReviewRepository(prisma)
  const getMyReviews = makeGetMyReviews(reviewRepo)
  const getReviewableItems = makeGetReviewableItems(reviewRepo)
  const createReview = makeCreateReview(reviewRepo)
  app.use('/me/reviews', requireAuth)
  app.use('/me/reviews/*', requireAuth)
  app.route('/me/reviews', makeReviewRouter(getMyReviews, getReviewableItems, createReview))
```

- [ ] **Шаг 7.10: Проверить типы бэкенда**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

Ожидаемо: 0 ошибок

- [ ] **Шаг 7.11: Коммит**

```bash
git add apps/api/src/features/reviews/ apps/api/src/app.ts
git commit -m "feat(api): add reviews endpoints"
```

---

## Task 8: Reviews — Frontend

**Files:**
- Create: `apps/web/src/entities/review/types.ts`
- Create: `apps/web/src/entities/review/reviewApi.ts`
- Create: `apps/web/src/entities/review/store.ts`
- Create: `apps/web/src/entities/review/index.ts`
- Modify: `apps/web/src/widgets/account-page/components/AccountReviews.vue`

- [ ] **Шаг 8.1: Создать entities/review/types.ts**

```ts
export type ReviewView = {
  id: string
  productId: string
  productName: string
  productImage: string | null
  orderId: string | null
  rating: number
  comment: string | null
  createdAt: string
}

export type ReviewableItem = {
  productId: string
  productName: string
  productImage: string | null
  orderId: string
}

export type CreateReviewData = {
  productId: string
  orderId: string
  rating: number
  comment?: string
}
```

- [ ] **Шаг 8.2: Создать entities/review/reviewApi.ts**

```ts
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'
import type { ReviewView, ReviewableItem, CreateReviewData } from './types'

const reviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productImage: z.string().nullable(),
  orderId: z.string().nullable(),
  rating: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string(),
})

const reviewableItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productImage: z.string().nullable(),
  orderId: z.string(),
})

export async function fetchMyReviews(): Promise<ReviewView[]> {
  const res = await authFetch('/me/reviews')
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load reviews'))
  return z.array(reviewSchema).parse(await res.json())
}

export async function fetchReviewableItems(): Promise<ReviewableItem[]> {
  const res = await authFetch('/me/reviews/reviewable')
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load reviewable items'))
  return z.array(reviewableItemSchema).parse(await res.json())
}

export async function submitReview(data: CreateReviewData): Promise<ReviewView> {
  const res = await authFetch('/me/reviews', { method: 'POST', json: data })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to submit review'))
  return reviewSchema.parse(await res.json())
}
```

- [ ] **Шаг 8.3: Создать entities/review/store.ts**

```ts
import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import type { ReviewView, ReviewableItem, CreateReviewData } from './types'
import { fetchMyReviews, fetchReviewableItems, submitReview } from './reviewApi'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref<ReviewView[]>([])
  const reviewableItems = ref<ReviewableItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [r, items] = await Promise.all([fetchMyReviews(), fetchReviewableItems()])
      reviews.value = r
      reviewableItems.value = items
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load reviews'
    } finally {
      loading.value = false
    }
  }

  async function create(data: CreateReviewData): Promise<void> {
    const created = await submitReview(data)
    reviews.value = [created, ...reviews.value]
    reviewableItems.value = reviewableItems.value.filter(
      item => !(item.productId === data.productId && item.orderId === data.orderId),
    )
  }

  return {
    reviews: readonly(reviews),
    reviewableItems: readonly(reviewableItems),
    loading: readonly(loading),
    error: readonly(error),
    load,
    create,
  }
})
```

- [ ] **Шаг 8.4: Создать entities/review/index.ts**

```ts
export { useReviewStore } from './store'
export type { ReviewView, ReviewableItem, CreateReviewData } from './types'
```

- [ ] **Шаг 8.5: Обновить AccountReviews.vue**

Полностью заменить содержимое `apps/web/src/widgets/account-page/components/AccountReviews.vue`:

```vue
<template>
  <section class="account-reviews">
    <div class="account-reviews__header">
      <h2 class="account-reviews__title">
        Reviews
      </h2>
      <button
        v-if="!showForm && store.reviewableItems.length > 0"
        class="account-reviews__add-btn"
        @click="showForm = true"
      >
        + Leave a review
      </button>
    </div>

    <p
      v-if="loading && reviews.length === 0"
      class="account-reviews__status"
    >
      Loading…
    </p>

    <p
      v-else-if="store.error"
      class="account-reviews__status account-reviews__status--error"
    >
      {{ store.error }}
    </p>

    <template v-else>
      <form
        v-if="showForm"
        class="account-reviews__form"
        @submit.prevent="submitForm"
      >
        <h3 class="account-reviews__form-title">
          Leave a review
        </h3>

        <div class="account-reviews__field">
          <label class="account-reviews__label">Product</label>
          <select v-model="selectedKey" class="account-reviews__select" required>
            <option value="" disabled>
              Select a product
            </option>
            <option
              v-for="item in store.reviewableItems"
              :key="item.productId + item.orderId"
              :value="item.productId + '|' + item.orderId"
            >
              {{ item.productName }}
            </option>
          </select>
        </div>

        <div class="account-reviews__field">
          <label class="account-reviews__label">Rating</label>
          <div class="account-reviews__stars">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="account-reviews__star"
              :class="{ 'account-reviews__star--active': n <= rating }"
              @click="rating = n"
            >
              ★
            </button>
          </div>
        </div>

        <div class="account-reviews__field">
          <label class="account-reviews__label">Comment <span class="account-reviews__optional">(optional)</span></label>
          <textarea
            v-model="comment"
            class="account-reviews__textarea"
            rows="3"
            placeholder="Share your experience…"
          />
        </div>

        <p v-if="formError" class="account-reviews__hint account-reviews__hint--error">
          {{ formError }}
        </p>

        <div class="account-reviews__form-actions">
          <AppButton type="submit" :disabled="!selectedKey || rating === 0 || formSaving">
            {{ formSaving ? 'Submitting…' : 'Submit review' }}
          </AppButton>
          <button type="button" class="account-reviews__cancel-btn" @click="closeForm">
            Cancel
          </button>
        </div>
      </form>

      <div
        v-if="reviews.length > 0"
        class="account-reviews__list"
      >
        <div
          v-for="review in reviews"
          :key="review.id"
          class="account-reviews__card"
        >
          <div class="account-reviews__card-image">
            <img
              v-if="review.productImage"
              :src="review.productImage"
              :alt="review.productName"
            >
            <span
              v-else
              class="account-reviews__card-image-placeholder"
            >?</span>
          </div>
          <div class="account-reviews__card-body">
            <p class="account-reviews__card-name">
              {{ review.productName }}
            </p>
            <div class="account-reviews__card-stars">
              <span
                v-for="n in 5"
                :key="n"
                class="account-reviews__card-star"
                :class="{ 'account-reviews__card-star--active': n <= review.rating }"
              >★</span>
            </div>
            <p v-if="review.comment" class="account-reviews__card-comment">
              {{ review.comment }}
            </p>
            <p class="account-reviews__card-date">
              {{ formatDate(review.createdAt) }}
            </p>
          </div>
        </div>
      </div>

      <div
        v-else-if="!showForm"
        class="account-reviews__empty"
      >
        <svg
          class="account-reviews__empty-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <p>No reviews yet</p>
        <p class="account-reviews__hint">
          After receiving your order you can leave a review
        </p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { AppButton } from '@/shared'
import { useReviewStore } from '@/entities/review'

const store = useReviewStore()
const reviews = computed(() => store.reviews)
const loading = computed(() => store.loading)

const showForm = ref(false)
const selectedKey = ref('')
const rating = ref(0)
const comment = ref('')
const formSaving = ref(false)
const formError = ref('')

function closeForm() {
  showForm.value = false
  selectedKey.value = ''
  rating.value = 0
  comment.value = ''
  formError.value = ''
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function submitForm() {
  if (!selectedKey.value || rating.value === 0) return
  formError.value = ''
  formSaving.value = true
  try {
    const [productId, orderId] = selectedKey.value.split('|')
    await store.create({
      productId,
      orderId,
      rating: rating.value,
      comment: comment.value.trim() || undefined,
    })
    closeForm()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    formSaving.value = false
  }
}

onMounted(() => {
  store.load()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.account-reviews {
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

  &__add-btn {
    font-size: 0.875rem;
    color: var(--color-accent);
    text-decoration: underline;
    background: none;
    border: none;
    font-family: var(--font-display);
  }

  &__status {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 480px;
    padding: 1.5rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    margin-bottom: 2rem;
  }

  &__form-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
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

  &__optional {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }

  &__select {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__stars {
    display: flex;
    gap: 0.25rem;
  }

  &__star {
    font-size: 2rem;
    color: var(--color-border);
    background: none;
    border: none;
    padding: 0;
    line-height: 1;
    transition: color 0.1s;

    &--active {
      color: var(--color-gold);
    }

    &:hover {
      color: var(--color-gold);
    }
  }

  &__textarea {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;
    resize: vertical;
    min-height: 80px;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__hint {
    font-size: 0.8rem;
    color: var(--color-text-muted);

    &--error {
      color: var(--color-error);
    }
  }

  &__form-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__cancel-btn {
    font-size: 0.875rem;
    color: var(--color-text-muted);
    text-decoration: underline;
    background: none;
    border: none;
    font-family: var(--font-display);
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__card {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
  }

  &__card-image {
    width: 64px;
    height: 64px;
    border-radius: 6px;
    overflow: hidden;
    background: rgb(var(--btn-gradient-light) / 0.5);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__card-image-placeholder {
    font-size: 1.5rem;
    color: var(--color-border);
  }

  &__card-body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__card-name {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text);
  }

  &__card-stars {
    display: flex;
    gap: 0.1rem;
  }

  &__card-star {
    font-size: 1rem;
    color: var(--color-border);

    &--active {
      color: var(--color-gold);
    }
  }

  &__card-comment {
    font-size: 0.9rem;
    color: var(--color-text);
    margin-top: 0.2rem;
  }

  &__card-date {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  &__empty {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  &__empty-icon {
    width: 48px;
    height: 48px;
    color: var(--color-border);
  }
}
</style>
```

- [ ] **Шаг 8.6: Проверить типы фронтенда**

```bash
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаемо: 0 ошибок

- [ ] **Шаг 8.7: Финальный прогон всех тестов**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic
```

Ожидаемо: все тесты зелёные

- [ ] **Шаг 8.8: Коммит**

```bash
git add apps/web/src/entities/review/ apps/web/src/widgets/account-page/components/AccountReviews.vue
git commit -m "feat(web): implement reviews UI"
```
