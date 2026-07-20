import { test, expect } from '@playwright/test'

test.describe('GanttChart integration', () => {
  test('mounts without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForSelector('.ibm-gantt-chart-svelte', { state: 'visible', timeout: 10000 })

    expect(errors).toHaveLength(0)
  })

  test('has expected title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/IBM Gantt Chart Svelte/)
  })

  test('mounts the gantt panel into the container', async ({ page }) => {
    await page.goto('/')
    // .gantt-panel is the root element the core library appends on construction
    await expect(page.locator('.ibm-gantt-chart-svelte .gantt-panel')).toBeVisible({ timeout: 10000 })
  })

  test('supports multiple row selection via Ctrl-click', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.ibm-gantt-chart-svelte', { state: 'visible', timeout: 10000 })

    const rowAnne = page.locator('tr[id="NURSES+Anne"]')
    const rowBethanie = page.locator('tr[id="NURSES+Bethanie"]')

    // Click first row
    await rowAnne.click()
    await expect(rowAnne).toHaveClass(/selected/)

    // Ctrl-click second row
    await rowBethanie.click({ modifiers: ['Control'] })
    await expect(rowAnne).toHaveClass(/selected/)
    await expect(rowBethanie).toHaveClass(/selected/)
  })

  test('renders text styling and table header presence correctly', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.ibm-gantt-chart-svelte', { state: 'visible', timeout: 10000 })

    const nameHeader = page.locator('th:has-text("Name")')
    await expect(nameHeader).toBeVisible()
    await expect(nameHeader).toHaveCSS('font-weight', '700')
    await expect(nameHeader).toHaveCSS('font-size', '16px')
  })

  test('toggles row highlight on hover', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.ibm-gantt-chart-svelte', { state: 'visible', timeout: 10000 })

    const timeRow = page.locator('.time-table-row').first()
    await timeRow.hover()
    await expect(timeRow).toHaveClass(/highlight/)
  })
})
