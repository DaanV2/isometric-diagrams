import { test, expect } from '@playwright/test';

test('debug UI mode switch', async ({ page }) => {
    // Capture console messages
    const consoleLogs: string[] = [];
    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    
    await page.goto('/');
    await page.waitForSelector('svg.iso-diagram');
    
    // Check initial state
    const uiBtn = page.getByRole('button', { name: 'UI' });
    const yamlBtn = page.getByRole('button', { name: 'YAML' });
    
    console.log('Before click:');
    console.log('UI button pressed:', await uiBtn.getAttribute('aria-pressed'));
    console.log('YAML button pressed:', await yamlBtn.getAttribute('aria-pressed'));
    console.log('Textarea visible:', await page.locator('textarea').isVisible());
    
    // Check DOM structure
    const sectionHtml = await page.locator('section[aria-label="YAML editor"]').innerHTML();
    console.log('Section inner HTML (first 500 chars):', sectionHtml.substring(0, 500));
    
    // Click UI button
    await uiBtn.click();
    await page.waitForTimeout(1000);
    
    console.log('After click:');
    console.log('UI button pressed:', await uiBtn.getAttribute('aria-pressed'));
    console.log('YAML button pressed:', await yamlBtn.getAttribute('aria-pressed'));
    console.log('Textarea visible:', await page.locator('textarea').isVisible());
    
    // Check for form
    const formCount = await page.getByRole('form', { name: 'Visual diagram editor' }).count();
    console.log('UIEditor form count:', formCount);
    
    // Check section data attribute
    const editorMode = await page.locator('section[aria-label="YAML editor"]').getAttribute('data-editor-mode');
    console.log('data-editor-mode after click:', editorMode);
    
    // Check if UIEditor div exists anywhere
    const uiEditorCount = await page.locator('[role="form"]').count();
    console.log('All form elements:', uiEditorCount);
    
    // Dump section HTML after click
    const sectionHtmlAfter = await page.locator('section[aria-label="YAML editor"]').innerHTML();
    console.log('Section inner HTML after click (first 500 chars):', sectionHtmlAfter.substring(0, 500));
    
    for (const log of consoleLogs) {
        console.log('BROWSER:', log);
    }
    
    // Accept test outcome (don't fail - just gather info)
    expect(true).toBe(true);
});
