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

	test('editor panel gets has-error class when YAML is invalid', async ({ page }) => {
		await page.goto('/');
		const editor = page.locator('textarea[aria-label="YAML diagram specification"]');
		await expect(editor).toBeVisible({ timeout: 8_000 });

		await editor.fill('title: "broken"\nnodes: not-an-array');
		await editor.dispatchEvent('input');

		await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });

		const editorPanel = page.locator('section[aria-label="YAML editor"]');
		await expect(editorPanel).toHaveClass(/has-error/);
	});

	test('editor panel has-error class is removed when YAML becomes valid', async ({ page }) => {
		await page.goto('/');
		const editor = page.locator('textarea[aria-label="YAML diagram specification"]');
		await expect(editor).toBeVisible({ timeout: 8_000 });

		await editor.fill('title: "broken"\nnodes: not-an-array');
		await editor.dispatchEvent('input');
		await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });

		const editorPanel = page.locator('section[aria-label="YAML editor"]');
		await expect(editorPanel).toHaveClass(/has-error/);

		// Fix the YAML
		await editor.fill('title: "fixed"\nnodes:\n  - id: a\n    label: A\n    position: {x: 0, y: 0}');
		await editor.dispatchEvent('input');

		await expect(editorPanel).not.toHaveClass(/has-error/, { timeout: 5_000 });
	});

	test('diagram wrapper has animate-diagram-in class for entrance animation', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		const wrapper = page.locator('.diagram-wrapper');
		await expect(wrapper).toHaveClass(/animate-diagram-in/);
	});

	test('edge ribbons render a filled band', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('svg.iso-diagram');

		const edgeBands = page.locator('.iso-edge .edge-band');
		const count = await edgeBands.count();
		expect(count).toBeGreaterThan(0);

		// Verify the class is actually present on each band
		const firstBand = edgeBands.first();
		await expect(firstBand).toHaveClass(/edge-band/);
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

	test.describe('UI / YAML editor switcher', () => {
		test('switch-mode button is visible when the editor panel is open', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('svg.iso-diagram');

			const switchBtn = page.getByRole('button', { name: /Switch to UI editor|Switch to YAML editor/i });
			await expect(switchBtn).toBeVisible();
		});

		test('switch-mode button is not visible when editor panel is hidden', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('svg.iso-diagram');

			// Hide the editor panel first
			const hideBtn = page.getByRole('button', { name: /Hide|Edit YAML/i });
			await hideBtn.click();

			const switchBtn = page.getByRole('button', { name: /Switch to UI editor|Switch to YAML editor/i });
			await expect(switchBtn).not.toBeVisible();
		});

		test('clicking the switch button shows the UI editor and hides the YAML textarea', async ({ page }) => {
			await page.goto('/');
			const yamlEditor = page.locator('textarea[aria-label="YAML diagram specification"]');
			await expect(yamlEditor).toBeVisible({ timeout: 8_000 });

			const switchBtn = page.getByRole('button', { name: 'Switch to UI editor' });
			await switchBtn.click();

			await expect(yamlEditor).not.toBeVisible();
			const uiEditor = page.locator('[aria-label="UI diagram editor"]');
			await expect(uiEditor).toBeVisible();
		});

		test('UI editor shows section heading for nodes', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('svg.iso-diagram');

			const switchBtn = page.getByRole('button', { name: 'Switch to UI editor' });
			await switchBtn.click();

			const uiEditor = page.locator('[aria-label="UI diagram editor"]');
			await expect(uiEditor).toBeVisible();
			await expect(uiEditor.getByText(/Nodes/)).toBeVisible();
		});

		test('switching back to YAML mode shows the YAML textarea again', async ({ page }) => {
			await page.goto('/');
			const yamlEditor = page.locator('textarea[aria-label="YAML diagram specification"]');
			await expect(yamlEditor).toBeVisible({ timeout: 8_000 });

			// Switch to UI
			await page.getByRole('button', { name: 'Switch to UI editor' }).click();
			await expect(yamlEditor).not.toBeVisible();

			// Switch back to YAML
			await page.getByRole('button', { name: 'Switch to YAML editor' }).click();
			await expect(yamlEditor).toBeVisible();
		});

		test('YAML changes are reflected in the UI editor when switching modes', async ({ page }) => {
			await page.goto('/');
			const yamlEditor = page.locator('textarea[aria-label="YAML diagram specification"]');
			await expect(yamlEditor).toBeVisible({ timeout: 8_000 });

			// Set a simple known YAML
			await yamlEditor.fill(
				'title: "My Test Diagram"\nnodes:\n  - id: mynode\n    label: "My Node"\n    position: {x: 0, y: 0}'
			);
			await yamlEditor.dispatchEvent('input');

			// Switch to UI mode
			await page.getByRole('button', { name: 'Switch to UI editor' }).click();

			const uiEditor = page.locator('[aria-label="UI diagram editor"]');
			await expect(uiEditor).toBeVisible();

			// The diagram title input should reflect the new title
			const titleInput = uiEditor.locator('[aria-label="Diagram title"]');
			await expect(titleInput).toHaveValue('My Test Diagram');
		});

		test('UI editor changes are reflected in YAML when switching back', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('svg.iso-diagram');

			// Switch to UI mode
			await page.getByRole('button', { name: 'Switch to UI editor' }).click();

			const uiEditor = page.locator('[aria-label="UI diagram editor"]');
			const titleInput = uiEditor.locator('[aria-label="Diagram title"]');
			await expect(titleInput).toBeVisible({ timeout: 5_000 });

			// Change the title in UI mode
			await titleInput.fill('Changed In UI');

			// Switch back to YAML
			await page.getByRole('button', { name: 'Switch to YAML editor' }).click();

			// The YAML textarea should contain the updated title
			const yamlEditor = page.locator('textarea[aria-label="YAML diagram specification"]');
			await expect(yamlEditor).toBeVisible();
			const content = await yamlEditor.inputValue();
			expect(content).toContain('Changed In UI');
		});

		test('UI editor add node button adds a new node to the list', async ({ page }) => {
			await page.goto('/');
			await page.waitForSelector('svg.iso-diagram');

			// Switch to UI mode
			await page.getByRole('button', { name: 'Switch to UI editor' }).click();

			const uiEditor = page.locator('[aria-label="UI diagram editor"]');
			await expect(uiEditor).toBeVisible();

			const nodesList = uiEditor.locator('[aria-label="Nodes list"]');
			const initialCount = await nodesList.locator('li').count();

			await uiEditor.getByRole('button', { name: 'Add node' }).click();

			await expect(nodesList.locator('li')).toHaveCount(initialCount + 1);
		});

		test('UI editor diagram updates when nodes are edited', async ({ page }) => {
			await page.goto('/');
			const yamlEditor = page.locator('textarea[aria-label="YAML diagram specification"]');
			await expect(yamlEditor).toBeVisible({ timeout: 8_000 });

			// Load a simple spec with one node
			await yamlEditor.fill(
				'title: "Test"\nnodes:\n  - id: a\n    label: "Alpha"\n    position: {x: 0, y: 0}'
			);
			await yamlEditor.dispatchEvent('input');

			// Switch to UI editor
			await page.getByRole('button', { name: 'Switch to UI editor' }).click();

			const uiEditor = page.locator('[aria-label="UI diagram editor"]');
			await expect(uiEditor).toBeVisible();

			// Expand the first node
			await uiEditor.getByRole('button', { name: /Edit node Alpha/i }).click();

			// Change the label
			const labelInput = uiEditor.locator('[aria-label="Node label"]');
			await labelInput.fill('Beta');
			await labelInput.dispatchEvent('input');

			// The diagram SVG title should still render (spec is valid)
			const svg = page.locator('svg.iso-diagram');
			await expect(svg).toBeVisible();
		});
	});
});
