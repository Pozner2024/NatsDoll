import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared')>()
  return { ...actual, apiFetch: vi.fn() }
})

vi.mock('vue-router', () => ({
  RouterLink: { name: 'RouterLink', template: '<a><slot /></a>' },
}))

import { apiFetch } from '@/shared'
import NewsletterConfirmPage from './NewsletterConfirmPage.vue'

const mockApiFetch = vi.mocked(apiFetch)

describe('NewsletterConfirmPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('показывает invalid без query-параметров', async () => {
    window.history.replaceState({}, '', '/newsletter/confirm')
    const wrapper = mount(NewsletterConfirmPage)
    await flushPromises()
    expect(wrapper.text()).toContain('The link is invalid')
  })

  it('подтверждает подписку по кнопке', async () => {
    window.history.replaceState({}, '', '/newsletter/confirm?email=a%40b.co&token=t1')
    mockApiFetch.mockResolvedValue({ ok: true } as Response)
    const wrapper = mount(NewsletterConfirmPage)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mockApiFetch).toHaveBeenCalledWith('/newsletter/confirm', {
      method: 'POST',
      json: { email: 'a@b.co', token: 't1' },
    })
    expect(wrapper.text()).toContain('Your subscription is confirmed')
  })

  it('показывает invalid при 400 от API', async () => {
    window.history.replaceState({}, '', '/newsletter/confirm?email=a%40b.co&token=bad')
    mockApiFetch.mockResolvedValue({ ok: false, status: 400 } as Response)
    const wrapper = mount(NewsletterConfirmPage)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('The link is invalid')
  })
})
