import { test, expect } from '@playwright/test';

test('debug2: check reactive effects and data attributes', async ({ page }) => {
  const effectLogs: string[] = [];
  const setEditorLogs: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[reactive-effect:editorMode]')) effectLogs.push(text);
    if (text.includes('[setEditorMode]')) setEditorLogs.push(text);
  });

  await page.goto('/');
  await page.waitForSelector('svg.iso-diagram', { timeout: 10000 });
  
  console.log('Initial effectLogs:', effectLogs);
  
  effectLogs.length = 0; // Clear to only capture changes
  
  await page.getByRole('button', { name: 'UI' }).click();
  await page.waitForTimeout(2000);
  
  console.log('setEditorMode logs:', setEditorLogs);
  console.log('effectLogs after click:', effectLogs);
  
  // Check the data-editor-mode attribute
  const sectionMode = await page.evaluate(() => {
    const section = document.querySelector('[data-editor-mode]');
    return section?.getAttribute('data-editor-mode');
  });
  console.log('data-editor-mode attribute:', sectionMode);
  
  // Check aria-pressed on mode buttons
  const buttonStates = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.mode-btn')).map(b => ({
      text: b.textContent?.trim(),
      pressed: b.getAttribute('aria-pressed')
    }));
  });
  console.log('Mode button states:', JSON.stringify(buttonStates));
  
  // Check textarea visibility
  const textarea = await page.evaluate(() => {
    const ta = document.querySelector('textarea[aria-label="YAML diagram specification"]');
    return { exists: !!ta, display: ta ? getComputedStyle(ta).display : 'N/A' };
  });
  console.log('Textarea state:', textarea);
});
