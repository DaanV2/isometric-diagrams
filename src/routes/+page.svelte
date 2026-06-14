<script lang="ts">
	import { parseYaml, dumpYaml, ParseError } from '$lib/parser/yaml-parser.js';
	import IsometricDiagram from '$lib/components/IsometricDiagram.svelte';
	import UiEditor from '$lib/components/UiEditor.svelte';
	import type { DiagramSpec } from '$lib/types/diagram.js';
	import { encodeShare, decodeShare } from '$lib/share.js';
	import { base } from '$app/paths';

	// ── Example definitions ──────────────────────────────────────
	const EXAMPLES: { name: string; file: string }[] = [
		{ name: 'Multi-Region Network', file: 'networking.yaml' },
		{ name: 'Cargo Flow', file: 'warehouse.yaml' },
		{ name: 'Order Flow', file: 'simple-flow.yaml' },
		{ name: 'Floor Plan', file: 'floor-plan.yaml' }
	];

	let editorYaml = $state('');
	let parseError = $state<string | null>(null);
	let spec = $state<DiagramSpec | null>(null);
	let activeExample = $state<string>('');
	let editorVisible = $state(true);
	let showGrid = $state(true);
	/** Current editor mode: 'yaml' shows the raw YAML textarea, 'ui' shows the visual form editor */
	let editorMode = $state<'ui' | 'yaml'>('yaml');

	/** Debounce window (ms) for re-parsing while typing in the YAML editor. */
	const COMPILE_DEBOUNCE_MS = 200;
	let compileTimer: ReturnType<typeof setTimeout> | undefined;

	/** localStorage key for the last-edited document. */
	const STORAGE_KEY = 'isometric-diagrams:doc';
	/** Set once the initial document has been restored, so we don't persist '' first. */
	let restored = $state(false);
	let shareMsg = $state<string | null>(null);
	let shareMsgTimer: ReturnType<typeof setTimeout> | undefined;

	/** Remove a #d=… permalink from the address bar once the doc diverges from it. */
	function clearShareHash() {
		if (typeof window !== 'undefined' && window.location.hash.includes('d=')) {
			history.replaceState(null, '', window.location.pathname + window.location.search);
		}
	}

	async function loadExample(file: string) {
		try {
			const res = await fetch(`${base}/examples/${file}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const text = await res.text();
			editorYaml = text;
			activeExample = file;
			clearShareHash();
			compileNow();
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

	/** Debounced compile for the textarea so typing isn't blocked by re-parsing. */
	function scheduleCompile() {
		clearShareHash();
		clearTimeout(compileTimer);
		compileTimer = setTimeout(compileYaml, COMPILE_DEBOUNCE_MS);
	}

	/** Compile immediately, cancelling any pending debounced compile. */
	function compileNow() {
		clearTimeout(compileTimer);
		compileYaml();
	}

	/** Toggle between 'yaml' and 'ui' editor modes, syncing state across the switch. */
	function toggleEditorMode() {
		if (editorMode === 'yaml') {
			// Switch YAML → UI: flush any pending debounced parse so the visual
			// editor reflects the very latest YAML edits.
			compileNow();
			editorMode = 'ui';
		} else {
			// Switch UI → YAML: dump current spec back into the YAML string
			if (spec) editorYaml = dumpYaml(spec);
			editorMode = 'yaml';
		}
	}

	/** Called by UiEditor when the user modifies the diagram in the visual editor. */
	function handleUiSpecChange(newSpec: DiagramSpec) {
		spec = newSpec;
	}

	/** The YAML text for the current document, dumping the spec when in UI mode. */
	function currentYaml(): string {
		return editorMode === 'ui' && spec ? dumpYaml(spec) : editorYaml;
	}

	/** Build a shareable permalink for the current document and copy it. */
	async function share() {
		const url = `${window.location.origin}${window.location.pathname}#d=${encodeShare(currentYaml())}`;
		try {
			history.replaceState(null, '', url);
		} catch {
			/* history not available */
		}
		let msg = 'Link copied to clipboard';
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			msg = 'Link added to the address bar';
		}
		shareMsg = msg;
		clearTimeout(shareMsgTimer);
		shareMsgTimer = setTimeout(() => (shareMsg = null), 2200);
	}

	/** Restore the initial document: permalink → last session → default example. */
	async function init() {
		const hashMatch = window.location.hash.match(/[#&]d=([^&]+)/);
		if (hashMatch) {
			try {
				editorYaml = decodeShare(hashMatch[1]);
				activeExample = '';
				compileNow();
				restored = true;
				return;
			} catch {
				/* malformed permalink — fall through */
			}
		}
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved && saved.trim()) {
				editorYaml = saved;
				activeExample = '';
				compileNow();
				restored = true;
				return;
			}
		} catch {
			/* storage unavailable */
		}
		await loadExample(EXAMPLES[0].file);
		restored = true;
	}

	// One-time restore on mount (effects only run in the browser).
	$effect(() => {
		init();
	});

	// Persist edits to localStorage once the initial document is restored.
	$effect(() => {
		const doc = editorYaml;
		if (!restored) return;
		try {
			localStorage.setItem(STORAGE_KEY, doc);
		} catch {
			/* storage full or unavailable */
		}
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
			{#each EXAMPLES as ex (ex.file)}
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
		{#if editorVisible}
			<button
				class="switch-mode-btn"
				onclick={toggleEditorMode}
				aria-label={editorMode === 'yaml' ? 'Switch to UI editor' : 'Switch to YAML editor'}
				title={editorMode === 'yaml' ? 'Switch to UI editor' : 'Switch to YAML editor'}
			>
				{editorMode === 'yaml' ? '⊞ UI' : '{ } YAML'}
			</button>
		{/if}
		<button
			class="toggle-grid"
			onclick={() => (showGrid = !showGrid)}
			aria-pressed={showGrid}
			aria-label="Toggle grid"
			title={showGrid ? 'Hide grid' : 'Show grid'}
		>
			{showGrid ? '⊞ Grid' : '⊟ Grid'}
		</button>
		<button
			class="share-btn"
			onclick={share}
			disabled={!spec && !editorYaml.trim()}
			aria-label="Copy a shareable link"
			title="Copy a shareable link to this diagram"
		>
			🔗 Share
		</button>
	</header>

	{#if shareMsg}
		<div class="share-toast" role="status" aria-live="polite">{shareMsg}</div>
	{/if}

	<main>
		{#if editorVisible}
			<section
				class="editor-panel"
				class:has-error={!!parseError && editorMode === 'yaml'}
				aria-label={editorMode === 'yaml' ? 'YAML editor' : 'UI editor'}
			>
				<div class="editor-toolbar">
					<span class="editor-label">{editorMode === 'yaml' ? 'YAML Spec' : 'Visual Editor'}</span>
					{#if editorMode === 'yaml'}
						<button class="apply-btn" onclick={compileNow}>▶ Apply</button>
					{/if}
				</div>

				{#if editorMode === 'yaml'}
					<textarea
						class="yaml-editor"
						bind:value={editorYaml}
						oninput={scheduleCompile}
						spellcheck={false}
						aria-label="YAML diagram specification"
					></textarea>
					{#if parseError}
						{#key parseError}
							<div class="error-banner animate-pop" role="alert">
								<span class="error-icon" aria-hidden="true">⚠</span>
								<strong>Parse error:</strong>
								{parseError}
							</div>
						{/key}
					{/if}
				{:else if spec}
					<UiEditor {spec} onspecchange={handleUiSpecChange} />
				{:else}
					<div class="ui-editor-placeholder">
						<span>⚠ Fix the YAML first, then switch to UI editor.</span>
					</div>
				{/if}
			</section>
		{/if}

		<section class="diagram-panel" aria-label="Diagram preview">
			{#if spec}
				<div class="diagram-wrapper animate-diagram-in">
					<IsometricDiagram {spec} {showGrid} />
				</div>
			{:else if !parseError}
				<div class="placeholder">Loading diagram…</div>
			{:else}
				{#key parseError}
					<div class="placeholder error animate-pop">Fix the YAML to see the diagram.</div>
				{/key}
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

	.switch-mode-btn {
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid #4299e1;
		background: #1d3557;
		color: #90cdf4;
		cursor: pointer;
		font-size: 12px;
		white-space: nowrap;
	}
	.switch-mode-btn:hover {
		background: #2a4a7f;
	}

	.ui-editor-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		padding: 16px;
		color: #f87171;
		font-size: 12px;
		text-align: center;
	}

	.toggle-grid {
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid #30363d;
		background: transparent;
		color: #8b949e;
		cursor: pointer;
		font-size: 12px;
		white-space: nowrap;
	}
	.toggle-grid:hover {
		background: #21262d;
		color: #e6edf3;
	}
	.toggle-grid[aria-pressed='true'] {
		background: #1b2a1b;
		border-color: #3fb950;
		color: #3fb950;
	}

	.share-btn {
		padding: 4px 10px;
		border-radius: 6px;
		border: 1px solid #30363d;
		background: transparent;
		color: #8b949e;
		cursor: pointer;
		font-size: 12px;
		white-space: nowrap;
	}
	.share-btn:hover:not(:disabled) {
		background: #21262d;
		color: #e6edf3;
	}
	.share-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.share-toast {
		position: fixed;
		top: 56px;
		right: 16px;
		z-index: 10;
		padding: 8px 14px;
		border-radius: 8px;
		background: #1d3557;
		border: 1px solid #4299e1;
		color: #cfe8ff;
		font-size: 12px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
		animation: pop 0.3s ease-out;
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
		padding: 1em;
		background: #7f1d1d;
		border-top: 2px solid #ef4444;
		color: #fecaca;
		font-size: 1.2rem;
		line-height: 1.5;
		border-radius: 0 0 8px 8px;
		display: flex;
		gap: 0.5em;
		align-items: flex-start;
	}

	.error-icon {
		font-size: 1.4rem;
		flex-shrink: 0;
		line-height: 1.3;
		animation: pulse-icon 1.5s ease-in-out infinite;
	}

	@keyframes pulse-icon {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
	}

	.animate-pop {
		animation: pop 0.5s ease-out;
	}

	@keyframes pop {
		0% {
			scale: 0.85;
			opacity: 0;
		}
		100% {
			scale: 1;
			opacity: 1;
		}
	}

	.editor-panel.has-error {
		border-right-color: #ef4444;
		animation: error-border-pulse 2s ease-in-out infinite;
	}

	@keyframes error-border-pulse {
		0%,
		100% {
			border-right-color: #ef4444;
		}
		50% {
			border-right-color: #7f1d1d;
		}
	}

	/* ── Diagram panel ────────────────────── */
	.diagram-panel {
		flex: 1;
		display: flex;
		overflow: hidden;
		padding: 16px;
		background: #0d1117;
		min-width: 0;
	}

	.diagram-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
	}

	.animate-diagram-in {
		animation: diagram-appear 0.4s ease-out;
	}

	@keyframes diagram-appear {
		from {
			opacity: 0.7;
			transform: scale(0.99);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	.placeholder {
		color: #8b949e;
		font-size: 14px;
	}
	.placeholder.error {
		color: #f87171;
		font-size: 1.1rem;
		font-weight: 600;
	}
</style>
