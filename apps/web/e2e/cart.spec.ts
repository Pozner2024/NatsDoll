import { test, expect } from '@playwright/test'

// Корзина и оформление защищены авторизацией (guest checkout стартует через логин).
// Happy-path с товарами требует залогиненного пользователя и PayPal sandbox — здесь
// надёжно (без учётных данных) покрываем гейтинг гостя на защищённом маршруте.
test.describe('Cart — гейтинг гостя', () => {
  test('страница /cart недоступна гостю: редирект на главную + логин', async ({ page }) => {
    await page.goto('/cart')

    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
    await expect(page.locator('#auth-email')).toBeVisible({ timeout: 15000 })
  })
})
