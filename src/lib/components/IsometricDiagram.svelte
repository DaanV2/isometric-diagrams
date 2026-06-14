<script lang="ts">
	import type { DiagramSpec } from '../types/diagram.js';
	import { boundingBox } from '../renderer/isometric.js';
	import { isoGridLines, groupBoundary, sortEdgesByDepth } from '../renderer/shapes.js';
	import { lightTheme, darkTheme } from '../renderer/theme.js';
	import IsometricNode from './IsometricNode.svelte';
	import IsometricEdge from './IsometricEdge.svelte';
	import IsometricFlatArrow from './IsometricFlatArrow.svelte';
	import IsometricFloorTile from './IsometricFloorTile.svelte';

	interface Props {
		spec: DiagramSpec;
		/** Override theme. If undefined, uses spec.settings.theme (default dark). */
		theme?: 'light' | 'dark';
		/** Override grid visibility. If undefined, uses spec.settings.showGrid (default true). */
		showGrid?: boolean;
		/** Fixed SVG width in px. Omit to auto-size to content. */
		width?: number;
		/** Fixed SVG height in px. Omit to auto-size to content. */
		height?: number;
	}

	let { spec, theme, showGrid: showGridProp, width, height }: Props = $props();

	const resolvedTheme = $derived(theme ?? spec.settings?.theme ?? 'dark');
	const themeVars = $derived(resolvedTheme === 'light' ? lightTheme : darkTheme);
	const tileSize = $derived(spec.settings?.tileSize ?? 64);
	const showGrid = $derived(showGridProp ?? spec.settings?.showGrid ?? true);

	/** Bounding box of all node positions in screen space */
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

	const AUTO_PADDING = 40;
	/** Resolved SVG dimensions — auto-size to content when props are omitted */
	const svgWidth = $derived(width ?? bbox.width + AUTO_PADDING * 2);
	const svgHeight = $derived(height ?? bbox.height + AUTO_PADDING * 2);

	/** Translate so the content is centred in the SVG */
	const offsetX = $derived(svgWidth / 2 - (bbox.minX + bbox.width / 2));
	const offsetY = $derived(svgHeight / 2 - (bbox.minY + bbox.height / 2));

	let selectedNodeId = $state<string | null>(null);

	function selectNode(id: string) {
		selectedNodeId = selectedNodeId === id ? null : id;
	}

	/** Grid line paths for background decoration */
	const gridLines = $derived.by(() =>
		showGrid ? isoGridLines(spec.nodes, tileSize) : []
	);

	/** Node lookup map — shared by edge sorting and group boundary computation */
	const nodeMap = $derived(new Map(spec.nodes.map((n) => [n.id, n])));

	/** Sort nodes back-to-front (painter's algorithm) */
	const sortedNodes = $derived(
		[...spec.nodes].sort(
			(a, b) => a.position.x + a.position.y - (b.position.x + b.position.y)
		)
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
</script>

<svg
	width={svgWidth}
	height={svgHeight}
	viewBox="0 0 {svgWidth} {svgHeight}"
	xmlns="http://www.w3.org/2000/svg"
	class="iso-diagram"
	data-diagram-title={spec.title}
	data-show-grid={showGrid}
	style="
		background: {themeVars.background};
		--background: {themeVars.background};
		--text: {themeVars.text};
		--text-secondary: {themeVars.textSecondary};
	"
>
	<!-- Title -->
	<text x="16" y="24" class="diagram-title" fill={themeVars.text}>{spec.title}</text>
	{#if spec.description}
		<text x="16" y="40" class="diagram-desc" fill={themeVars.textSecondary}
			>{spec.description}</text
		>
	{/if}

	<g class="content" style="transform: translate({offsetX}px, {offsetY}px)">
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
			<IsometricEdge
				{edge}
				{nodeMap}
				{tileSize}
				offsetX={0}
				offsetY={0}
			/>
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

{#if selectedNodeId}
	{@const sel = spec.nodes.find((n) => n.id === selectedNodeId)}
	{#if sel}
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
			<strong>{sel.label}</strong>
			{#if sel.type}<span class="badge">{sel.type}</span>{/if}
			{#if sel.description}<p>{sel.description}</p>{/if}
			{#if sel.meta}
				<dl>
					{#each Object.entries(sel.meta) as [k, v] (k)}
						<dt>{k}</dt>
						<dd>{v}</dd>
					{/each}
				</dl>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.iso-diagram {
		display: block;
		border-radius: 8px;
		font-family: system-ui, sans-serif;
	}
	.diagram-title {
		font-size: 15px;
		font-weight: 700;
		font-family: system-ui, sans-serif;
	}
	.diagram-desc {
		font-size: 11px;
		font-family: system-ui, sans-serif;
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
