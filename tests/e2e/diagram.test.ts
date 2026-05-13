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

	test('error banner has the animate-pop class for visibility', async ({ page }) => {
		await page.goto('/');
		const editor = page.locator('textarea[aria-label="YAML diagram specification"]');
		await expect(editor).toBeVisible({ timeout: 8_000 });

		await editor.fill('title: "broken"\nnodes: not-an-array');
		await editor.dispatchEvent('input');

		const alert = page.getByRole('alert');
		await expect(alert).toBeVisible({ timeout: 5_000 });
		await expect(alert).toHaveClass(/animate-pop/);
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

	test('grid toggle button is visible in the header', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		const gridBtn = page.getByRole('button', { name: 'Toggle grid' });
		await expect(gridBtn).toBeVisible();
	});

	test('grid is shown by default', async ({ page }) => {
		await page.goto('/');
		const svg = page.locator('svg.iso-diagram');
		await expect(svg).toBeVisible({ timeout: 10_000 });

		// data-show-grid attribute should be "true" by default
		await expect(svg).toHaveAttribute('data-show-grid', 'true');
	});

	test('clicking the grid toggle hides and shows the grid', async ({ page }) => {
		await page.goto('/');
		const svg = page.locator('svg.iso-diagram');
		await expect(svg).toBeVisible({ timeout: 10_000 });

		// Grid is on by default
		await expect(svg).toHaveAttribute('data-show-grid', 'true');

		// Click the grid toggle button to hide the grid
		const gridBtn = page.getByRole('button', { name: 'Toggle grid' });
		await gridBtn.click();
		await expect(svg).toHaveAttribute('data-show-grid', 'false');

		// Click again to show the grid
		await gridBtn.click();
		await expect(svg).toHaveAttribute('data-show-grid', 'true');
	});

	test('grid toggle button reflects pressed state', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		const gridBtn = page.getByRole('button', { name: 'Toggle grid' });

		// Initially pressed (grid on)
		await expect(gridBtn).toHaveAttribute('aria-pressed', 'true');

		// After click, not pressed (grid off)
		await gridBtn.click();
		await expect(gridBtn).toHaveAttribute('aria-pressed', 'false');
	});
});

test.describe('UI Editor', () => {
	test('mode switch buttons are visible when editor is open', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await expect(page.getByRole('button', { name: 'UI' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'YAML' })).toBeVisible();
	});

	test('can switch to UI editor mode', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await page.getByRole('button', { name: 'UI' }).click();

		// Visual editor form should appear
		const uiEditor = page.getByRole('form', { name: 'Visual diagram editor' });
		await expect(uiEditor).toBeVisible({ timeout: 5_000 });

		// YAML textarea should be hidden
		const textarea = page.locator('textarea[aria-label="YAML diagram specification"]');
		await expect(textarea).not.toBeVisible();
	});

	test('can switch back from UI to YAML mode', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await page.getByRole('button', { name: 'UI' }).click();
		await page.getByRole('button', { name: 'YAML' }).click();

		const textarea = page.locator('textarea[aria-label="YAML diagram specification"]');
		await expect(textarea).toBeVisible({ timeout: 5_000 });
	});

	test('UI editor shows form fields for diagram properties', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await page.getByRole('button', { name: 'UI' }).click();

		await expect(page.getByLabel('Diagram title')).toBeVisible({ timeout: 5_000 });
		await expect(page.getByLabel('Diagram type')).toBeVisible();
		await expect(page.getByLabel('Theme')).toBeVisible();
	});

	test('UI editor shows nodes list', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await page.getByRole('button', { name: 'UI' }).click();

		const nodesList = page.getByRole('list', { name: 'Nodes list' });
		await expect(nodesList).toBeVisible({ timeout: 5_000 });

		// Networking example has 10 nodes
		await expect(nodesList.getByRole('listitem')).toHaveCount(10, { timeout: 5_000 });
	});

	test('editing title in UI mode updates the diagram immediately', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await page.getByRole('button', { name: 'UI' }).click();

		const titleInput = page.getByLabel('Diagram title');
		await titleInput.fill('My Test Diagram');
		// Trigger the oninput handler
		await titleInput.dispatchEvent('input');

		// Diagram SVG title attribute should update
		await expect(page.locator('svg.iso-diagram')).toHaveAttribute(
			'data-diagram-title',
			'My Test Diagram',
			{ timeout: 5_000 }
		);
	});

	test('UI edits are reflected in YAML when switching back', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await page.getByRole('button', { name: 'UI' }).click();

		const titleInput = page.getByLabel('Diagram title');
		await titleInput.fill('Round-trip Title');
		await titleInput.dispatchEvent('input');

		// Switch back to YAML mode
		await page.getByRole('button', { name: 'YAML' }).click();

		const textarea = page.locator('textarea[aria-label="YAML diagram specification"]');
		const content = await textarea.inputValue();
		expect(content).toContain('Round-trip Title');
	});

	test('adding a node in UI mode updates the diagram', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await page.getByRole('button', { name: 'UI' }).click();
		await page.waitForSelector('[aria-label="Nodes list"]');

		const addNodeBtn = page.getByRole('button', { name: 'Add node' });
		await addNodeBtn.click();

		// Node count in the list should increase (10 → 11)
		const nodesList = page.getByRole('list', { name: 'Nodes list' });
		await expect(nodesList.getByRole('listitem')).toHaveCount(11, { timeout: 5_000 });
	});

	test('UI editor is hidden when editor panel is toggled off', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		await page.getByRole('button', { name: 'UI' }).click();
		const uiEditor = page.getByRole('form', { name: 'Visual diagram editor' });
		await expect(uiEditor).toBeVisible({ timeout: 5_000 });

		// Hide the entire editor panel
		const toggleBtn = page.getByRole('button', { name: /Hide|Edit YAML/i });
		await toggleBtn.click();
		await expect(uiEditor).not.toBeVisible();
	});
});
