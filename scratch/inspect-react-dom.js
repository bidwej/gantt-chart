const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:3002/');
    await page.waitForSelector('.ibm-gantt-chart-react', { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Resize container to 100px height to force vertical overflow
    await page.locator('.ibm-gantt-chart-react').evaluate(el => {
      el.style.height = '100px';
    });
    // Trigger window resize or wait for layout
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(1000);

    const initialInfo = await page.evaluate(() => {
      const scroller = document.querySelector('.time-table-scroller');
      const tableBody = document.querySelector('.gantt-tree-table tbody');
      return {
        scrollerScrollHeight: scroller.scrollHeight,
        scrollerClientHeight: scroller.clientHeight,
        tableBodyScrollHeight: tableBody.scrollHeight,
        tableBodyClientHeight: tableBody.clientHeight,
      };
    });
    console.log('--- BEFORE SCROLL ---', initialInfo);

    // Scroll the time-table-scroller programmatically
    await page.locator('.time-table-scroller').evaluate(el => {
      el.scrollTop = 50;
    });
    // Dispatch scroll event
    await page.locator('.time-table-scroller').dispatchEvent('scroll');
    await page.waitForTimeout(500);

    const afterScrollInfo = await page.evaluate(() => {
      const scroller = document.querySelector('.time-table-scroller');
      const tableBody = document.querySelector('.gantt-tree-table tbody');
      return {
        scrollerScrollTop: scroller.scrollTop,
        tableBodyScrollTop: tableBody.scrollTop
      };
    });
    console.log('--- AFTER SCROLL ---', afterScrollInfo);
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
