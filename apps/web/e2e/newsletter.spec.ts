import { test, expect } from '@playwright/test'

const NEWSLETTER_URL = '**/newsletter/subscribe'

test.describe('Newsletter subscribe', () => {
  test('успешная подписка показывает сообщение об успехе', async ({ page }) => {
    await page.goto('/')
    await page.route(NEWSLETTER_URL, (route) =>
      route.fulfill({ status: 200, body: '' })
    )

    await page.locator('[data-testid="newsletter-email"]').scrollIntoViewIfNeeded()
    await page.locator('[data-testid="newsletter-email"]').fill('test@example.com')
    await page.locator('[data-testid="newsletter-submit"]').click()

    await expect(page.locator('[data-testid="newsletter-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="newsletter-success"]')).toHaveText("You're in!")
  })

  test('ошибка сервера показывает сообщение об ошибке', async ({ page }) => {
    await page.goto('/')
    await page.route(NEWSLETTER_URL, (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Этот email уже подписан' }),
      })
    )

    await page.locator('[data-testid="newsletter-email"]').scrollIntoViewIfNeeded()
    await page.locator('[data-testid="newsletter-email"]').fill('existing@example.com')
    await page.locator('[data-testid="newsletter-submit"]').click()

    await expect(page.locator('[data-testid="newsletter-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="newsletter-error"]')).toHaveText('Этот email уже подписан')
    await expect(page.locator('[data-testid="newsletter-email"]')).toBeVisible()
  })

  test('во время загрузки кнопка и поле задизейблены', async ({ page }) => {
    let resolveRequest!: () => void
    const requestHeld = new Promise<void>((res) => { resolveRequest = res })

    await page.goto('/')
    await page.locator('[data-testid="newsletter-email"]').scrollIntoViewIfNeeded()

    await page.route(NEWSLETTER_URL, async (route) => {
      await requestHeld
      await route.fulfill({ status: 200, body: '' })
    })

    await page.locator('[data-testid="newsletter-email"]').fill('test@example.com')
    await page.locator('[data-testid="newsletter-submit"]').click()

    await expect(page.locator('[data-testid="newsletter-submit"]')).toBeDisabled()
    await expect(page.locator('[data-testid="newsletter-email"]')).toBeDisabled()

    resolveRequest()
    await expect(page.locator('[data-testid="newsletter-success"]')).toBeVisible()
  })
})
