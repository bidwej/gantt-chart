const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const artifactDir = 'C:\\Users\\bidwe\\.gemini\\antigravity\\brain\\96a74200-bca7-4ab2-ac37-dd965eb102a3';
  
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const runCheck = async (url, containerSel, label, picName) => {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1000, height: 800 });
    
    console.log(`Checking ${label} Storybook at ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 15000 });
      await page.waitForSelector(containerSel, { state: 'visible', timeout: 15000 });
      await page.waitForTimeout(2000); // Settle animation/timeline
      
      const picPath = path.join(artifactDir, picName);
      await page.screenshot({ path: picPath });
      console.log(`  Saved screenshot: ${picPath}`);
      
      const details = await page.evaluate((sel) => {
        const container = document.querySelector(sel);
        const nameHeader = document.querySelector('.gantt-tree-table th');
        const tableRow = document.querySelector('.gantt-tree-table td');
        
        const headerStyles = nameHeader ? window.getComputedStyle(nameHeader) : null;
        const rowStyles = tableRow ? window.getComputedStyle(tableRow) : null;
        
        return {
          hasContainer: !!container,
          hasTable: !!nameHeader,
          header: headerStyles ? {
            fontSize: headerStyles.fontSize,
            fontWeight: headerStyles.fontWeight,
            color: headerStyles.color,
            backgroundColor: headerStyles.backgroundColor,
          } : null,
          row: rowStyles ? {
            fontSize: rowStyles.fontSize,
            fontWeight: rowStyles.fontWeight,
            color: rowStyles.color,
          } : null
        };
      }, containerSel);
      
      await page.close();
      return { success: true, details };
    } catch (err) {
      await page.close();
      console.error(`  Error checking ${label}:`, err.message);
      return { success: false, error: err.message };
    }
  };

  const results = {};

  // 1. Vanilla HTML Docs Storybook (Port 9001)
  results.htmlDocs = await runCheck(
    'http://localhost:9001/iframe.html?id=storybook-examples--basic&viewMode=story',
    '.gantt-panel',
    'HTML Docs (Vanilla)',
    'html_docs_storybook.png'
  );

  // 2. React Wrapper Storybook (Port 9002)
  results.reactWrapper = await runCheck(
    'http://localhost:9002/iframe.html?id=components-ganttchart--default&viewMode=story',
    '.ibm-gantt-chart-react',
    'React Wrapper',
    'react_wrapper_storybook.png'
  );

  // 3. Svelte Wrapper Storybook (Port 6006)
  results.svelteWrapper = await runCheck(
    'http://localhost:6006/iframe.html?id=components-ganttchart--default&viewMode=story',
    '.ibm-gantt-chart-svelte',
    'Svelte Wrapper',
    'svelte_wrapper_storybook.png'
  );

  console.log('\n=== VERIFICATION RESULTS ===');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
})();
