<script lang="ts">
	import { parseYaml, ParseError } from '$lib/parser/yaml-parser.js';
	import IsometricDiagram from '$lib/components/IsometricDiagram.svelte';
	import type { DiagramSpec } from '$lib/types/diagram.js';

	// ── Example definitions ──────────────────────────────────────
	const EXAMPLES: { name: string; file: string }[] = [
		{ name: 'Multi-Region Network', file: 'networking.yaml' },
		{ name: 'Cargo Flow', file: 'warehouse.yaml' },
		{ name: 'Order Flow', file: 'simple-flow.yaml' }
	];

	let editorYaml = $state('');
	let parseError = $state<string | null>(null);
	let spec = $state<DiagramSpec | null>(null);
	let activeExample = $state<string>('');
	let diagramWidth = $state(860);
	let diagramHeight = $state(520);
	let editorVisible = $state(true);

	async function loadExample(file: string) {
		try {
			const res = await fetch(`/examples/${file}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const text = await res.text();
			editorYaml = text;
			activeExample = file;
			compileYaml();
		} catch (e) {
			parseError = `Could not load example: ${(e as Error).message}`;
		}
	}

	function compileYaml() {
		parseError = null;
		try {
			spec = parseYaml(editorYaml);
		} catch (e) {
			parseError = e instanceof ParseError ? e.message : String(e);
			spec = null;
		}
	}

	// Load the first example on mount using Svelte 5 effect
	$effect(() => {
		loadExample(EXAMPLES[0].file);
	});
</script>

<svelte:head>
	<title>Isometric Diagrams</title>
	<meta
		name="description"
		content="Interactive isometric diagram viewer with YAML spec. Visualise networks, flows, and more."
	/>
</svelte:head>

<div class="app">
	<header>
		<div class="brand">
			<span class="logo" aria-hidden="true">◆</span>
			<span>Isometric Diagrams</span>
		</div>
		<nav aria-label="Examples">
			{#each EXAMPLES as ex}
				<button
					class="example-btn"
					class:active={activeExample === ex.file}
					onclick={() => loadExample(ex.file)}
				>
					{ex.name}
				</button>
			{/each}
		</nav>
		<button
			class="toggle-editor"
			onclick={() => (editorVisible = !editorVisible)}
			aria-pressed={editorVisible}
			title={editorVisible ? 'Hide editor' : 'Show editor'}
		>
			{editorVisible ? '‹ Hide' : '› Edit YAML'}
		</button>
	</header>

	<main>
		{#if editorVisible}
			<section class="editor-panel" aria-label="YAML editor">
				<div class="editor-toolbar">
					<span class="editor-label">YAML Spec</span>
					<button class="apply-btn" onclick={compileYaml}>▶ Apply</button>
				</div>
				<textarea
					class="yaml-editor"
					bind:value={editorYaml}
					oninput={compileYaml}
					spellcheck={false}
					aria-label="YAML diagram specification"
				></textarea>
				{#if parseError}
					<div class="error-banner" role="alert">
						<strong>Parse error:</strong>
						{parseError}
					</div>
				{/if}
			</section>
		{/if}

		<section class="diagram-panel" aria-label="Diagram preview">
			{#if spec}
				<div class="diagram-wrapper" style="position: relative;">
					<IsometricDiagram {spec} width={diagramWidth} height={diagramHeight} />
				</div>
			{:else if !parseError}
				<div class="placeholder">Loading diagram…</div>
			{:else}
				<div class="placeholder error">Fix the YAML to see the diagram.</div>
			{/if}
		</section>
	</main>
</div>

<style>
	:global(*, *::before, *::after) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, sans-serif;
		background: #0d1117;
		color: #e6edf3;
	}

	.app {
		display: flex;
		flex-direction: column;
		height: 100dvh;
		overflow: hidden;
	}

	/* ── Header ───────────────────────────── */
	header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 16px;
		height: 48px;
		background: #161b22;
		border-bottom: 1px solid #21262d;
		flex-shrink: 0;
		flex-wrap: wrap;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 700;
		font-size: 15px;
		color: #e6edf3;
		white-space: nowrap;
	}

	.logo {
		color: #4299e1;
		font-size: 18px;
	}

	nav {
		display: flex;
		gap: 4px;
		flex: 1;
	}

	.example-btn {
		padding: 4px 12px;
		border-radius: 6px;
		border: 1px solid #30363d;
		background: transparent;
		color: #8b949e;
		cursor: pointer;
		font-size: 12px;
		transition: background 0.15s, color 0.15s;
	}
	.example-btn:hover {
		background: #21262d;
		color: #e6edf3;
	}
	.example-btn.active {
		background: #1d3557;
		border-color: #4299e1;
		color: #90cdf4;
	}

	.toggle-editor {
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid #30363d;
		background: transparent;
		color: #8b949e;
		cursor: pointer;
		font-size: 12px;
		white-space: nowrap;
	}
	.toggle-editor:hover {
		background: #21262d;
		color: #e6edf3;
	}

	/* ── Main layout ──────────────────────── */
	main {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	/* ── Editor panel ─────────────────────── */
	.editor-panel {
		display: flex;
		flex-direction: column;
		width: 320px;
		min-width: 200px;
		flex-shrink: 0;
		border-right: 1px solid #21262d;
		background: #161b22;
		overflow: hidden;
	}

	.editor-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 10px;
		border-bottom: 1px solid #21262d;
	}

	.editor-label {
		font-size: 11px;
		color: #8b949e;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.apply-btn {
		padding: 3px 10px;
		border-radius: 5px;
		border: 1px solid #4299e1;
		background: #1d3557;
		color: #90cdf4;
		cursor: pointer;
		font-size: 11px;
	}
	.apply-btn:hover {
		background: #2a4a7f;
	}

	.yaml-editor {
		flex: 1;
		resize: none;
		border: none;
		background: #0d1117;
		color: #e6edf3;
		font-family: 'Fira Code', 'Cascadia Code', 'Menlo', monospace;
		font-size: 11px;
		line-height: 1.6;
		padding: 10px;
		outline: none;
		overflow-y: auto;
	}

	.error-banner {
		padding: 8px 10px;
		background: #3b0a0a;
		border-top: 1px solid #6b1a1a;
		color: #fca5a5;
		font-size: 11px;
	}

	/* ── Diagram panel ────────────────────── */
	.diagram-panel {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: auto;
		padding: 16px;
		background: #0d1117;
	}

	.diagram-wrapper {
		display: inline-block;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
	}

	.placeholder {
		color: #8b949e;
		font-size: 14px;
	}
	.placeholder.error {
		color: #f87171;
	}
</style>
