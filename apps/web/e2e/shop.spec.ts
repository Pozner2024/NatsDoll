import { test, expect } from '@playwright/test'

test('shop catalog golden path', async ({ page }) => {
  await page.goto('/shop')
  await page.waitForLoadState('networkidle')

  await expect(page.getByRole('heading', { name: 'The shop' })).toBeVisible()
  await expect(page.locator('.category-pills__pill').first()).toBeVisible()
  await expect(page.locator('.product-card').first()).toBeVisible()

  await page.getByRole('link', { name: 'Art Dolls' }).click()
  await expect(page).toHaveURL(/\/shop\/art-dolls/)
  await expect(page.locator('.shop-catalog__crumb')).toContainText('Art Dolls')

  await page.getByLabel(/sort/i).selectOption('price-asc')
  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(page).not.toHaveURL(/page=/)

  const firstCard = page.locator('.product-card').first()
  const productHref = await firstCard.locator('a.product-card__image-link').getAttribute('href')
  expect(productHref).toMatch(/^\/product\/.+/)

  await firstCard.locator('a.product-card__image-link').click()
  await expect(page).toHaveURL(new RegExp(productHref!.replace(/[/]/g, '\\/')))

  await page.goBack()
  await expect(page).toHaveURL(/\/shop\/art-dolls\?sort=price-asc/)
  await expect(page.getByRole('heading', { name: 'The shop' })).toBeVisible()
})
