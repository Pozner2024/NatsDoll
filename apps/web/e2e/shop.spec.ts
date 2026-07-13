import { test, expect } from '@playwright/test'

test('shop catalog golden path', async ({ page }) => {
  await page.goto('/shop')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: 'The shop' })).toBeVisible()
  await expect(page.locator('.category-pills__pill').first()).toBeVisible()
  await expect(page.locator('.product-card').first()).toBeVisible({ timeout: 15000 })

  await page.getByRole('link', { name: 'Art Dolls' }).click()
  await expect(page).toHaveURL(/\/shop\/art-dolls/)
  await expect(page.locator('.shop-catalog__crumb')).toContainText('Art Dolls')

  await page.getByLabel(/sort/i).selectOption('price-asc')
  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(page).not.toHaveURL(/page=/)

  // Ждём догрузку/гидратацию пересозданного после сортировки списка, иначе клик
  // опережает vue-router обработчик.
  await page.waitForLoadState('networkidle')

  const firstCard = page.locator('.product-card').first()
  const productHref = await firstCard.locator('a.product-card__image-link').getAttribute('href')
  expect(productHref).toMatch(/^\/product\/.+/)

  // Клик может опередить гидратацию и не сработать. Ретраим, но интервал (4с)
  // заведомо больше времени успешной SPA-навигации, поэтому медленный-но-успешный
  // клик не кликается повторно — история не засоряется.
  const link = firstCard.locator('a.product-card__image-link')
  await expect(async () => {
    if (new URL(page.url()).pathname === productHref) return
    await link.click()
    await page.waitForURL(`**${productHref}`, { timeout: 4000 })
  }).toPass({ intervals: [4000], timeout: 24000 })
})
