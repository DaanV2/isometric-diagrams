const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5174/');
  await page.waitForSelector('svg.iso-diagram', { timeout: 10000 });
  console.log('Diagram loaded');

  const uiBtn = page.getByRole('button', { name: 'UI' });
  await uiBtn.click();
  console.log('Clicked UI button');

  await page.waitForTimeout(1000);

  const innerHtml = await page.evaluate(() => {
    const editorPanel = document.querySelector('.editor-panel');
    return editorPanel?.innerHTML?.substring(0, 1200) || 'NO EDITOR PANEL';
  });
  console.log('Editor panel HTML:\n', innerHtml);

  const form = !!await page.evaluate(() => document.querySelector('[role="form"][aria-label="Visual diagram editor"]'));
  console.log('UIEditor form found:', form);

  const diagramTitle = !!await page.evaluate(() => document.querySelector('[aria-label="Diagram title"]'));
  console.log('Diagram title input found:', diagramTitle);

  await browser.close();
})().catch(console.error);
