const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', err => {
    console.log(`[Browser Error] ${err.toString()}`);
  });
  
  console.log('Navigating to local Storybook...');
  await page.goto('http://localhost:9001/iframe.html?id=storybook-examples--activity-chart&viewMode=story');
  await page.waitForTimeout(5000);
  
  const html = await page.content();
  console.log('HTML contains gantt-panel:', html.includes('gantt-panel'));
  console.log('HTML contains gantt-tree-table:', html.includes('gantt-tree-table'));
  console.log('HTML contains timeline:', html.includes('vis-timeline'));
  
  await browser.close();
})();
