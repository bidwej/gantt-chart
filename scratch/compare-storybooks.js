const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  
  const runStorybookCheck = async (url, label) => {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1000, height: 800 });
    
    const errors = [];
    const consoleMsgs = [];
    
    page.on('console', msg => {
      consoleMsgs.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      errors.push(err.toString());
    });
    
    console.log(`Navigating to ${label} Storybook...`);
    await page.goto(url);
    
    const containerSelector = label === 'React' ? '.ibm-gantt-chart-react' : '.ibm-gantt-chart-svelte';
    await page.waitForSelector(containerSelector, { state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const details = await page.evaluate((sel) => {
      const container = document.querySelector(sel);
      const nameHeader = document.querySelector('.gantt-tree-table th');
      const tableRow = document.querySelector('.gantt-tree-table td');
      
      const headLinks = Array.from(document.querySelectorAll('head link[rel="stylesheet"]')).map(el => el.href);
      const headStyles = Array.from(document.querySelectorAll('head style')).map(el => el.textContent.substring(0, 100) + '...');
      
      const headerStyles = nameHeader ? window.getComputedStyle(nameHeader) : null;
      const rowStyles = tableRow ? window.getComputedStyle(tableRow) : null;
      
      return {
        stylesheets: headLinks,
        styleTagsCount: headStyles.length,
        styleTagsSample: headStyles,
        headerStyles: headerStyles ? {
          fontSize: headerStyles.fontSize,
          fontWeight: headerStyles.fontWeight,
          fontFamily: headerStyles.fontFamily,
          color: headerStyles.color,
          backgroundColor: headerStyles.backgroundColor,
          height: nameHeader.offsetHeight,
        } : null,
        rowStyles: rowStyles ? {
          fontSize: rowStyles.fontSize,
          fontWeight: rowStyles.fontWeight,
          fontFamily: rowStyles.fontFamily,
          color: rowStyles.color,
          height: tableRow.offsetHeight,
        } : null
      };
    }, containerSelector);
    
    await page.close();
    return { details, errors, consoleMsgs };
  };

  const reactRes = await runStorybookCheck(
    'http://localhost:9001/iframe.html?id=components-ganttchart--default&viewMode=story',
    'React'
  );
  
  const svelteRes = await runStorybookCheck(
    'http://localhost:6006/iframe.html?id=components-ganttchart--default&viewMode=story',
    'Svelte'
  );

  console.log('\n--- DETAILED COMPARISON ---');
  console.log('\n=== REACT ===');
  console.log(JSON.stringify(reactRes, null, 2));
  console.log('\n=== SVELTE ===');
  console.log(JSON.stringify(svelteRes, null, 2));

  await browser.close();
})();
