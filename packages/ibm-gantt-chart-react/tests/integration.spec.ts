import { test, expect } from '@playwright/test'

test.describe('GanttChart integration', () => {
  test('mounts without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForSelector('.ibm-gantt-chart-react', { state: 'visible', timeout: 10000 })

    expect(errors).toHaveLength(0)
  })

  test('has expected title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/IBM Gantt Chart React/)
  })

  test('mounts the gantt panel into the container', async ({ page }) => {
    await page.goto('/')
    // .gantt-panel is the root element the core library appends on construction
    await expect(page.locator('.ibm-gantt-chart-react .gantt-panel')).toBeVisible({ timeout: 10000 })
  })

  test('supports multiple row selection via Ctrl-click', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.ibm-gantt-chart-react', { state: 'visible', timeout: 10000 })

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
    await page.waitForSelector('.ibm-gantt-chart-react', { state: 'visible', timeout: 10000 })

    const nameHeader = page.locator('th:has-text("Name")')
    await expect(nameHeader).toBeVisible()
    await expect(nameHeader).toHaveCSS('font-weight', '700')
    await expect(nameHeader).toHaveCSS('font-size', '16px')
  })

  test('toggles row highlight on hover', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.ibm-gantt-chart-react', { state: 'visible', timeout: 10000 })

    const timeRow = page.locator('.time-table-row').first()
    await timeRow.hover()
    await expect(timeRow).toHaveClass(/highlight/)
  })

  test('synchronizes vertical scroll (vscroll) from timetable scroller to table body', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.ibm-gantt-chart-react', { state: 'visible', timeout: 10000 })

    // Resize container to force vertical scrollbar/overflow
    await page.locator('.ibm-gantt-chart-react').evaluate(el => {
      el.style.height = '100px';
    })
    await page.waitForTimeout(500)

    // Scroll timetable scroller programmatically
    const scroller = page.locator('.time-table-scroller')
    await scroller.evaluate(el => {
      el.scrollTop = 50;
    })
    await scroller.dispatchEvent('scroll')
    await page.waitForTimeout(500)

    // Assert that table body's scrollTop matches the scroll position
    const tableScrollTop = await page.locator('.gantt-tree-table tbody').evaluate(el => el.scrollTop)
    expect(tableScrollTop).toBe(50)
  })
})
