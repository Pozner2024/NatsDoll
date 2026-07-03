import { test, expect } from '@playwright/test'

// Гость должен свободно попадать на /cart: гостевой checkout стартует прямо здесь
// (клиентская корзина в localStorage + поле email), логин требуется только на шаге
// оплаты. Здесь надёжно (без учётных данных) проверяем, что гостя НЕ редиректит с /cart.
test.describe('Cart — доступ гостя', () => {
  test('страница /cart доступна гостю: без редиректа, видна корзина', async ({ page }) => {
    await page.goto('/cart')

    await expect(page).toHaveURL(/\/cart$/, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible({ timeout: 15000 })
  })
})
