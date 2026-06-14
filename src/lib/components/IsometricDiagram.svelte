<script lang="ts">
	import type { DiagramSpec } from '../types/diagram.js';
	import { boundingBox } from '../renderer/isometric.js';
	import { isoGridLines, groupBoundary, sortEdgesByDepth } from '../renderer/shapes.js';
	import { lightTheme, darkTheme } from '../renderer/theme.js';
	import IsometricNode from './IsometricNode.svelte';
	import IsometricEdge from './IsometricEdge.svelte';
	import IsometricFlatArrow from './IsometricFlatArrow.svelte';
	import IsometricFloorTile from './IsometricFloorTile.svelte';
	import { downloadSvg, downloadPng, filenameFromTitle } from '../export.js';

	interface Props {
		spec: DiagramSpec;
		/** Override theme. If undefined, uses spec.settings.theme (default dark). */
		theme?: 'light' | 'dark';
		/** Override grid visibility. If undefined, uses spec.settings.showGrid (default true). */
		showGrid?: boolean;
		/** Fixed viewport width in px. Omit to fill the parent container. */
		width?: number;
		/** Fixed viewport height in px. Omit to fill the parent container. */
		height?: number;
	}

	let { spec, theme, showGrid: showGridProp, width, height }: Props = $props();

	const resolvedTheme = $derived(theme ?? spec.settings?.theme ?? 'dark');
	const themeVars = $derived(resolvedTheme === 'light' ? lightTheme : darkTheme);
	const tileSize = $derived(spec.settings?.tileSize ?? 64);
	const showGrid = $derived(showGridProp ?? spec.settings?.showGrid ?? true);

	/** Bounding box of all content in screen (world) space. */
	const bbox = $derived(
		boundingBox(
			[
				...spec.nodes.map((n) => ({ x: n.position.x, y: n.position.y, z: n.position.z ?? 0 })),
				...(spec.floorTiles ?? []).map((t) => ({
					x: t.position.x + (t.width ?? 1) - 1,
					y: t.position.y + (t.depth ?? 1) - 1,
					z: t.position.z ?? 0
				})),
				...(spec.flatArrows ?? []).flatMap((a) => [
					{ x: a.from.x, y: a.from.y, z: a.from.z ?? 0 },
					{ x: a.to.x, y: a.to.y, z: a.to.z ?? 0 }
				])
			],
			{ tileSize }
		)
	);

	// ── Pan / zoom viewport ────────────────────────────────────────
	const FIT_PADDING = 0.88; // leave a margin around content when fitting
	const MIN_ZOOM = 0.05;
	const MAX_ZOOM = 16;

	let viewportEl: HTMLDivElement | null = $state(null);
	let svgEl: SVGSVGElement | null = $state(null);
	/** Measured viewport size in px (content box). */
	let vpW = $state(0);
	let vpH = $state(0);

	/** User-controlled view; null means "follow the auto-fit view". */
	let userZoom = $state<number | null>(null);
	let userCenter = $state<{ x: number; y: number } | null>(null);

	const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

	/** Zoom (screen px per world px) that fits all content in the viewport. */
	const fitZoom = $derived.by(() => {
		if (vpW <= 0 || vpH <= 0 || bbox.width <= 0 || bbox.height <= 0) return 1;
		return clamp(Math.min(vpW / bbox.width, vpH / bbox.height) * FIT_PADDING, MIN_ZOOM, MAX_ZOOM);
	});
	const fitCenter = $derived({ x: bbox.minX + bbox.width / 2, y: bbox.minY + bbox.height / 2 });

	const zoom = $derived(userZoom ?? fitZoom);
	const center = $derived(userCenter ?? fitCenter);

	/** viewBox kept at the viewport's aspect ratio so screen↔world mapping is linear. */
	const viewBox = $derived.by(() => {
		const w = (vpW || bbox.width || 1) / zoom;
		const h = (vpH || bbox.height || 1) / zoom;
		return `${center.x - w / 2} ${center.y - h / 2} ${w} ${h}`;
	});

	const zoomPercent = $derived(Math.round(zoom * 100));

	function clientToWorld(clientX: number, clientY: number) {
		const rect = viewportEl?.getBoundingClientRect();
		if (!rect) return { x: center.x, y: center.y };
		const px = clientX - rect.left;
		const py = clientY - rect.top;
		return { x: center.x + (px - vpW / 2) / zoom, y: center.y + (py - vpH / 2) / zoom };
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		const rect = viewportEl?.getBoundingClientRect();
		if (!rect) return;
		const before = clientToWorld(e.clientX, e.clientY);
		const k = e.deltaY < 0 ? 1.12 : 1 / 1.12;
		const newZoom = clamp(zoom * k, MIN_ZOOM, MAX_ZOOM);
		const px = e.clientX - rect.left;
		const py = e.clientY - rect.top;
		// Keep the point under the cursor fixed while zooming.
		userZoom = newZoom;
		userCenter = { x: before.x - (px - vpW / 2) / newZoom, y: before.y - (py - vpH / 2) / newZoom };
	}

	// Drag-to-pan. Panning starts only on empty background so node clicks still select.
	let panning = $state(false);
	let lastX = 0;
	let lastY = 0;

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		if ((e.target as Element)?.closest('.iso-node')) return;
		panning = true;
		lastX = e.clientX;
		lastY = e.clientY;
		viewportEl?.setPointerCapture(e.pointerId);
	}
	function onPointerMove(e: PointerEvent) {
		if (!panning) return;
		const dx = e.clientX - lastX;
		const dy = e.clientY - lastY;
		lastX = e.clientX;
		lastY = e.clientY;
		userZoom = zoom;
		userCenter = { x: center.x - dx / zoom, y: center.y - dy / zoom };
	}
	function endPan(e: PointerEvent) {
		panning = false;
		try {
			viewportEl?.releasePointerCapture(e.pointerId);
		} catch {
			/* pointer already released */
		}
	}

	function zoomByButton(k: number) {
		userZoom = clamp(zoom * k, MIN_ZOOM, MAX_ZOOM);
		userCenter = { ...center };
	}
	/** Reset to the auto-fit view. */
	function fitView() {
		userZoom = null;
		userCenter = null;
	}

	// ── Export ─────────────────────────────────────────────────────
	let exporting = $state(false);
	function exportOpts() {
		return {
			background: themeVars.background,
			filename: filenameFromTitle(spec.title),
			padding: 32
		};
	}
	function exportSvg() {
		if (svgEl) downloadSvg(svgEl, bbox, exportOpts());
	}
	async function exportPng() {
		if (!svgEl) return;
		exporting = true;
		try {
			await downloadPng(svgEl, bbox, exportOpts());
		} finally {
			exporting = false;
		}
	}

	let selectedNodeId = $state<string | null>(null);
	function selectNode(id: string) {
		selectedNodeId = selectedNodeId === id ? null : id;
	}

	/** Grid line paths for background decoration */
	const gridLines = $derived.by(() => (showGrid ? isoGridLines(spec.nodes, tileSize) : []));

	/** Node lookup map — shared by edges, sorting and group boundary computation */
	const nodeMap = $derived(new Map(spec.nodes.map((n) => [n.id, n])));

	/** Sort nodes back-to-front (painter's algorithm) */
	const sortedNodes = $derived(
		[...spec.nodes].sort((a, b) => a.position.x + a.position.y - (b.position.x + b.position.y))
	);

	/** Sort edges back-to-front by midpoint depth (same x+y heuristic as nodes) */
	const sortedEdges = $derived(sortEdgesByDepth(spec.edges ?? [], nodeMap));

	/** Group boundary polygons */
	const groupPolygons = $derived.by(() => {
		if (!spec.groups) return [];
		return spec.groups
			.map((g) => {
				const memberNodes = g.nodes.map((id) => nodeMap.get(id)).filter((n) => n !== undefined);
				const boundary = groupBoundary(memberNodes, tileSize);
				if (!boundary) return null;
				return { id: g.id, label: g.label, color: g.color, ...boundary };
			})
			.filter(Boolean);
	});

	const selectedNode = $derived(
		selectedNodeId ? spec.nodes.find((n) => n.id === selectedNodeId) : undefined
	);
</script>

<div
	class="iso-viewport"
	class:panning
	role="application"
	aria-label="Diagram canvas: {spec.title}. Scroll to zoom, drag to pan."
	bind:this={viewportEl}
	bind:clientWidth={vpW}
	bind:clientHeight={vpH}
	style:width={width ? `${width}px` : '100%'}
	style:height={height ? `${height}px` : '100%'}
	style:background={themeVars.background}
	onwheel={onWheel}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={endPan}
	onpointercancel={endPan}
>
	<svg
		bind:this={svgEl}
		width="100%"
		height="100%"
		viewBox={viewBox}
		preserveAspectRatio="xMidYMid meet"
		xmlns="http://www.w3.org/2000/svg"
		class="iso-diagram"
		data-diagram-title={spec.title}
		data-show-grid={showGrid}
		style="
			--background: {themeVars.background};
			--text: {themeVars.text};
			--text-secondary: {themeVars.textSecondary};
		"
	>
		<g class="content">
			<!-- Grid lines -->
			{#if showGrid}
				{#each gridLines as d, i (i)}
					<path {d} fill="none" stroke={themeVars.gridLine} stroke-width="0.5" opacity="0.5" />
				{/each}
			{/if}

			<!-- Group highlights -->
			{#each groupPolygons as grp (grp?.id)}
				{#if grp}
					<polygon
						points={grp.points}
						fill={grp.color ? grp.color + '18' : themeVars.groupFill}
						stroke={grp.color ?? themeVars.groupStroke}
						stroke-width="1.5"
						stroke-dasharray="6,3"
					/>
					<text
						x={grp.labelX}
						y={grp.labelY}
						text-anchor="middle"
						class="group-label"
						fill={grp.color ?? themeVars.textSecondary}
					>
						{grp.label}
					</text>
				{/if}
			{/each}

			<!-- Floor tiles (drawn below everything else) -->
			{#each spec.floorTiles ?? [] as tile (tile.id ?? `${tile.position.x}-${tile.position.y}`)}
				<IsometricFloorTile {tile} {tileSize} offsetX={0} offsetY={0} />
			{/each}

			<!-- Flat arrows (on the ground, above floor tiles, below regular edges) -->
			{#each spec.flatArrows ?? [] as arrow (arrow.id ?? `${arrow.from.x}-${arrow.from.y}-${arrow.to.x}-${arrow.to.y}`)}
				<IsometricFlatArrow {arrow} {tileSize} offsetX={0} offsetY={0} />
			{/each}

			<!-- Edges (drawn below nodes, sorted back-to-front) -->
			{#each sortedEdges as edge (edge.id ?? `${edge.from}-${edge.to}`)}
				<IsometricEdge {edge} {nodeMap} {tileSize} offsetX={0} offsetY={0} />
			{/each}

			<!-- Nodes (painter's order) -->
			{#each sortedNodes as node (node.id)}
				<IsometricNode
					{node}
					{tileSize}
					offsetX={0}
					offsetY={0}
					selected={selectedNodeId === node.id}
					onclick={selectNode}
				/>
			{/each}
		</g>
	</svg>

	<!-- Fixed chrome overlaid on the diagram (does not pan/zoom) -->
	<div class="diagram-titles" style:color={themeVars.text}>
		<span class="diagram-title">{spec.title}</span>
		{#if spec.description}
			<span class="diagram-desc" style:color={themeVars.textSecondary}>{spec.description}</span>
		{/if}
	</div>

	<div class="zoom-controls" role="group" aria-label="Zoom controls">
		<button type="button" aria-label="Zoom in" title="Zoom in" onclick={() => zoomByButton(1.2)}>＋</button>
		<button type="button" aria-label="Zoom out" title="Zoom out" onclick={() => zoomByButton(1 / 1.2)}>−</button>
		<button type="button" class="fit-btn" aria-label="Fit to view" title="Fit to view" onclick={fitView}>⊡</button>
		<span class="zoom-readout" aria-live="polite">{zoomPercent}%</span>
	</div>

	<div class="export-controls" role="group" aria-label="Export diagram">
		<button type="button" aria-label="Export as SVG" title="Download as SVG" onclick={exportSvg}>SVG</button>
		<button
			type="button"
			aria-label="Export as PNG"
			title="Download as PNG"
			onclick={exportPng}
			disabled={exporting}
		>
			{exporting ? '…' : 'PNG'}
		</button>
	</div>

	{#if selectedNode}
		<div
			class="node-info"
			style="
				background: {themeVars.background};
				color: {themeVars.text};
				border-color: {themeVars.gridLine};
			"
			role="status"
			aria-live="polite"
		>
			<strong>{selectedNode.label}</strong>
			{#if selectedNode.type}<span class="badge">{selectedNode.type}</span>{/if}
			{#if selectedNode.description}<p>{selectedNode.description}</p>{/if}
			{#if selectedNode.meta}
				<dl>
					{#each Object.entries(selectedNode.meta) as [k, v] (k)}
						<dt>{k}</dt>
						<dd>{v}</dd>
					{/each}
				</dl>
			{/if}
		</div>
	{/if}
</div>

<style>
	.iso-viewport {
		position: relative;
		overflow: hidden;
		border-radius: 8px;
		touch-action: none;
		overscroll-behavior: contain;
		cursor: grab;
	}
	.iso-viewport.panning {
		cursor: grabbing;
	}
	.iso-diagram {
		display: block;
		font-family: system-ui, sans-serif;
	}

	/* ── Fixed overlays ── */
	.diagram-titles {
		position: absolute;
		top: 12px;
		left: 14px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		pointer-events: none;
		max-width: calc(100% - 120px);
	}
	.diagram-title {
		font-size: 15px;
		font-weight: 700;
	}
	.diagram-desc {
		font-size: 11px;
	}

	.zoom-controls {
		position: absolute;
		top: 12px;
		right: 12px;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 4px;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(4px);
	}
	.zoom-controls button {
		width: 26px;
		height: 26px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.06);
		color: #e6edf3;
		cursor: pointer;
		font-size: 14px;
		line-height: 1;
	}
	.zoom-controls button:hover {
		background: rgba(255, 255, 255, 0.16);
	}
	.zoom-readout {
		min-width: 40px;
		text-align: center;
		font-size: 11px;
		color: #e6edf3;
		font-variant-numeric: tabular-nums;
	}

	.export-controls {
		position: absolute;
		bottom: 12px;
		left: 12px;
		display: flex;
		gap: 4px;
		padding: 4px;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(4px);
	}
	.export-controls button {
		height: 26px;
		padding: 0 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.06);
		color: #e6edf3;
		cursor: pointer;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.03em;
	}
	.export-controls button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.16);
	}
	.export-controls button:disabled {
		opacity: 0.5;
		cursor: progress;
	}

	.group-label {
		font-size: 10px;
		font-family: system-ui, sans-serif;
		font-weight: 600;
	}
	.node-info {
		position: absolute;
		bottom: 16px;
		right: 16px;
		padding: 12px 16px;
		border: 1px solid;
		border-radius: 8px;
		font-size: 13px;
		min-width: 160px;
		max-width: 240px;
	}
	.node-info strong {
		display: block;
		margin-bottom: 4px;
	}
	.badge {
		display: inline-block;
		padding: 1px 6px;
		border-radius: 4px;
		font-size: 10px;
		background: #1d3557;
		color: #a8dadc;
		margin-bottom: 6px;
	}
	.node-info p {
		margin: 4px 0 6px;
		font-size: 11px;
	}
	.node-info dl {
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2px 8px;
	}
	.node-info dt {
		font-weight: 600;
		font-size: 10px;
	}
	.node-info dd {
		margin: 0;
		font-size: 10px;
	}
</style>
