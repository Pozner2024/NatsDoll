import { test, expect, type Page } from '@playwright/test'

// Открытие модалки устойчиво к гонке гидратации: повторяем клик по «Login»,
// пока не появится поле email (open() идемпотентен — лишние клики не закрывают).
async function openLogin(page: Page) {
  const loginBtn = page.getByRole('button', { name: 'Login', exact: true })
  await expect(loginBtn).toBeVisible()
  await expect(async () => {
    await loginBtn.click()
    await expect(page.locator('#auth-email')).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 15000 })
}

test.describe('Auth — login modal', () => {
  test('открывается из хедера и валидирует пустую отправку', async ({ page }) => {
    await page.goto('/')
    await openLogin(page)

    await page.locator('.auth-modal__submit').click()
    await expect(page.locator('.auth-modal__error').first()).toBeVisible()
  })

  test('серверная ошибка входа показывает глобальное сообщение', async ({ page }) => {
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid email or password' }),
      }),
    )

    await page.goto('/')
    await openLogin(page)

    await page.locator('#auth-email').fill('user@example.com')
    await page.locator('#auth-password').fill('wrongpass')
    await page.locator('.auth-modal__submit').click()

    await expect(page.locator('.auth-modal__error--global')).toBeVisible()
    await expect(page.locator('.auth-modal__error--global')).toContainText('Invalid email or password')
  })
})
