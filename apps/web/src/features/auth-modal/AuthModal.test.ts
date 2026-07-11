import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { useAuthModal } from '@/shared'
import { useAuthStore } from '@/entities/user'
import AuthModal from './AuthModal.vue'

vi.mock('@/entities/user', () => ({ useAuthStore: vi.fn() }))

const login = vi.fn()
const register = vi.fn()
const requestPasswordReset = vi.fn()

const BaseModalStub = defineComponent({
  props: { isOpen: Boolean, labelledBy: String },
  emits: ['close', 'open'],
  setup(props, { slots }) {
    return () => (props.isOpen ? h('div', slots.default?.()) : null)
  },
})

async function mountModal(mode: 'login' | 'register' | 'forgot' = 'login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/')
  const wrapper = mount(AuthModal, {
    global: { plugins: [router], stubs: { BaseModal: BaseModalStub } },
  })
  useAuthModal().open(mode)
  await nextTick()
  return { wrapper, router }
}

async function submitLogin(wrapper: VueWrapper, email: string, password: string) {
  await wrapper.find('#auth-email').setValue(email)
  await wrapper.find('#auth-password').setValue(password)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('AuthModal — вход', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    sessionStorage.clear()
    vi.mocked(useAuthStore).mockReturnValue({ login, register, requestPasswordReset } as never)
  })

  it('невалидный email: показывает ошибку и не вызывает login', async () => {
    const { wrapper } = await mountModal()

    await submitLogin(wrapper, 'not-an-email', 'secret')

    expect(wrapper.find('.auth-modal__error').text()).toContain('real email')
    expect(login).not.toHaveBeenCalled()
  })

  it('пустой пароль: показывает ошибку и не вызывает login', async () => {
    const { wrapper } = await mountModal()

    await wrapper.find('#auth-email').setValue('nat@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.auth-modal__error').text()).toContain('password')
    expect(login).not.toHaveBeenCalled()
  })

  it('успех: вызывает login с данными формы и закрывает модалку', async () => {
    login.mockResolvedValue(undefined)
    const { wrapper } = await mountModal()

    await submitLogin(wrapper, 'nat@example.com', 'secret')

    expect(login).toHaveBeenCalledWith({ email: 'nat@example.com', password: 'secret' })
    expect(useAuthModal().isOpen).toBe(false)
  })

  it('успех с сохранённым auth_redirect: переходит по нему и очищает ключ', async () => {
    login.mockResolvedValue(undefined)
    sessionStorage.setItem('auth_redirect', '/cart')
    const { wrapper, router } = await mountModal()
    const push = vi.spyOn(router, 'push')

    await submitLogin(wrapper, 'nat@example.com', 'secret')

    expect(push).toHaveBeenCalledWith('/cart')
    expect(sessionStorage.getItem('auth_redirect')).toBe(null)
  })

  it('auth_redirect на чужой origin заменяется на "/"', async () => {
    login.mockResolvedValue(undefined)
    sessionStorage.setItem('auth_redirect', 'https://evil.example.com/phish')
    const { wrapper, router } = await mountModal()
    const push = vi.spyOn(router, 'push')

    await submitLogin(wrapper, 'nat@example.com', 'secret')

    expect(push).toHaveBeenCalledWith('/')
  })

  it('ошибка API: показывает сообщение, модалка остаётся открытой', async () => {
    login.mockRejectedValue(new Error('Invalid email or password'))
    const { wrapper } = await mountModal()

    await submitLogin(wrapper, 'nat@example.com', 'wrong')

    expect(wrapper.find('[role="alert"]').text()).toBe('Invalid email or password')
    expect(useAuthModal().isOpen).toBe(true)
  })

  it('смена режима после ошибки сбрасывает сообщение об ошибке', async () => {
    login.mockRejectedValue(new Error('Invalid email or password'))
    const { wrapper } = await mountModal()
    await submitLogin(wrapper, 'nat@example.com', 'wrong')
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    useAuthModal().open('register')
    await nextTick()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})

describe('AuthModal — регистрация', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    sessionStorage.clear()
    vi.mocked(useAuthStore).mockReturnValue({ login, register, requestPasswordReset } as never)
  })

  it('короткий пароль: показывает ошибку и не вызывает register', async () => {
    const { wrapper } = await mountModal('register')

    await wrapper.find('#auth-name').setValue('Nat')
    await wrapper.find('#auth-reg-email').setValue('nat@example.com')
    await wrapper.find('#auth-reg-password').setValue('abc')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.auth-modal__error').text()).toContain('at least 4 characters')
    expect(register).not.toHaveBeenCalled()
  })

  it('успех: вызывает register, показывает verify-pending и сохраняет auth_redirect', async () => {
    register.mockResolvedValue('pending')
    const { wrapper } = await mountModal('register')

    await wrapper.find('#auth-name').setValue('Nat')
    await wrapper.find('#auth-reg-email').setValue('nat@example.com')
    await wrapper.find('#auth-reg-password').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(register).toHaveBeenCalledWith({ name: 'Nat', email: 'nat@example.com', password: 'secret' })
    expect(useAuthModal().mode).toBe('verify-pending')
    expect(wrapper.text()).toContain('Check your email')
    expect(sessionStorage.getItem('auth_redirect')).toBe('/')
  })
})

describe('AuthModal — восстановление пароля', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    sessionStorage.clear()
    vi.mocked(useAuthStore).mockReturnValue({ login, register, requestPasswordReset } as never)
  })

  it('успех: вызывает requestPasswordReset и показывает нейтральное подтверждение', async () => {
    requestPasswordReset.mockResolvedValue(undefined)
    const { wrapper } = await mountModal('forgot')

    await wrapper.find('#auth-forgot-email').setValue('nat@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(requestPasswordReset).toHaveBeenCalledWith('nat@example.com')
    expect(wrapper.text()).toContain('If an account exists for that email')
  })
})
