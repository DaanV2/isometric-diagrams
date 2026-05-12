import { test, expect } from '@playwright/test';

test.describe('Isometric Diagrams App', () => {
	test('page loads and shows the app header', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle('Isometric Diagrams');
		await expect(page.getByText('Isometric Diagrams', { exact: false })).toBeVisible();
	});

	test('shows the example navigation buttons', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('button', { name: 'Multi-Region Network' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Cargo Flow' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Order Flow' })).toBeVisible();
	});

	test('loads the Multi-Region Network example and renders an SVG', async ({ page }) => {
		await page.goto('/');
		// Wait for the SVG diagram to appear (networking example loads by default)
		const svg = page.locator('svg.iso-diagram');
		await expect(svg).toBeVisible({ timeout: 10_000 });
		await expect(svg).toHaveAttribute('data-diagram-title', 'Multi-Region Network');
	});

	test('YAML editor is visible and contains yaml content', async ({ page }) => {
		await page.goto('/');
		const editor = page.locator('textarea[aria-label="YAML diagram specification"]');
		await expect(editor).toBeVisible({ timeout: 10_000 });
		const content = await editor.inputValue();
		expect(content).toContain('title:');
		expect(content).toContain('nodes:');
	});

	test('shows correct node count for networking example', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');
		// The networking example has 10 nodes
		const nodes = page.locator('.iso-node');
		await expect(nodes).toHaveCount(10, { timeout: 10_000 });
	});

	test('clicking Cargo Flow loads that diagram', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await page.getByRole('button', { name: 'Cargo Flow' }).click();

		const svg = page.locator('svg.iso-diagram');
		await expect(svg).toHaveAttribute('data-diagram-title', 'Cargo Flow: Port to Warehouse', {
			timeout: 8_000
		});
	});

	test('clicking Order Flow loads that diagram', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await page.getByRole('button', { name: 'Order Flow' }).click();

		const svg = page.locator('svg.iso-diagram');
		await expect(svg).toHaveAttribute('data-diagram-title', 'Order Processing Flow', {
			timeout: 8_000
		});
	});

	test('active example button is highlighted', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		const networkBtn = page.getByRole('button', { name: 'Multi-Region Network' });
		await expect(networkBtn).toHaveClass(/active/);

		await page.getByRole('button', { name: 'Cargo Flow' }).click();
		await page.waitForSelector('svg[data-diagram-title="Cargo Flow: Port to Warehouse"]');

		const cargoBtn = page.getByRole('button', { name: 'Cargo Flow' });
		await expect(cargoBtn).toHaveClass(/active/);
	});

	test('toggle editor button hides and shows the editor', async ({ page }) => {
		await page.goto('/');
		const editor = page.locator('textarea[aria-label="YAML diagram specification"]');
		await expect(editor).toBeVisible({ timeout: 8_000 });

		const toggleBtn = page.getByRole('button', { name: /Hide|Edit YAML/i });
		await toggleBtn.click();
		await expect(editor).not.toBeVisible();

		await toggleBtn.click();
		await expect(editor).toBeVisible();
	});

	test('entering invalid YAML shows an error banner', async ({ page }) => {
		await page.goto('/');
		const editor = page.locator('textarea[aria-label="YAML diagram specification"]');
		await expect(editor).toBeVisible({ timeout: 8_000 });

		// Replace content with invalid YAML
		await editor.fill('title: "broken"\nnodes: not-an-array');
		await editor.dispatchEvent('input');

		await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });
		await expect(page.getByRole('alert')).toContainText('Parse error');
	});

	test('SVG contains edges connecting nodes', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');
		const edges = page.locator('.iso-edge');
		// Networking example has many edges
		const count = await edges.count();
		expect(count).toBeGreaterThan(0);
	});

	test('clicking a node shows the node info panel', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('.iso-node');

		// Click the first node in the diagram
		const firstNode = page.locator('.iso-node').first();
		await firstNode.click();

		// A status region should appear with the node info
		await expect(page.getByRole('status')).toBeVisible({ timeout: 5_000 });
	});
});
