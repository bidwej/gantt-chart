const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:9001/iframe.html?id=storybook-examples--activity-chart&viewMode=story');
  await page.waitForSelector('.gantt-panel', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(3000);
  
  const textContainers = await page.locator('.text-container').count();
  const textContents = await page.locator('.text-content').count();
  const svgs = await page.locator('svg').count();
  const svgLines = await page.locator('svg line, svg path').count();
  
  console.log('Text containers count:', textContainers);
  console.log('Text contents count:', textContents);
  console.log('SVG count:', svgs);
  console.log('SVG lines/paths count:', svgLines);
  
  if (textContainers > 0) {
    const sampleText = await page.locator('.text-content').first().innerText();
    const sampleStyle = await page.locator('.text-container').first().evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        left: style.left,
        color: style.color,
        fontSize: style.fontSize,
        width: el.offsetWidth,
        height: el.offsetHeight
      };
    });
    console.log('Sample text content:', sampleText);
    console.log('Sample text container style:', sampleStyle);
  }
  
  await browser.close();
})();
