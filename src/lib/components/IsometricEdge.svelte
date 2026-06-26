<script lang="ts">
	import type { DiagramEdge, DiagramNode } from '../types/diagram.js';
	import { edgeGeometry, type EdgeGeometry } from '../renderer/shapes.js';
	import { getEdgeColour } from '../renderer/theme.js';

	interface Props {
		edge: DiagramEdge;
		/** Lookup of node id → node, shared by the parent diagram. */
		nodeMap: Map<string, DiagramNode>;
		tileSize: number;
		offsetX: number;
		offsetY: number;
	}

	let { edge, nodeMap, tileSize, offsetX, offsetY }: Props = $props();

	const fromNode = $derived(nodeMap.get(edge.from));
	const toNode = $derived(nodeMap.get(edge.to));
	const colour = $derived(edge.style?.color ?? getEdgeColour(edge.type));
	const directed = $derived(edge.directed !== false); // default true
	const dashed = $derived(edge.type === 'dependency');

	const geo = $derived.by((): EdgeGeometry | null => {
		if (!fromNode || !toNode) return null;
		return edgeGeometry(fromNode, toNode, directed, Boolean(edge.label), tileSize);
	});
</script>

{#if geo}
	<g
		class="iso-edge"
		data-edge-from={edge.from}
		data-edge-to={edge.to}
		filter="url(#iso-edge-glow)"
		style="transform: translate({offsetX}px, {offsetY}px)"
	>
		<!-- Ribbon band lying flat on the ground -->
		<path
			d={geo.path}
			class="edge-band"
			fill={colour}
			fill-opacity={dashed ? 0.42 : 0.8}
			stroke={colour}
			stroke-opacity="0.95"
			stroke-width="0.75"
			stroke-linejoin="round"
		/>
		<!-- Gloss spine down the ribbon's centre -->
		<path
			d={geo.spine}
			class="edge-spine"
			class:edge-spine--dashed={dashed}
			fill="none"
			stroke="#ffffff"
			stroke-opacity="0.32"
			stroke-width="1.25"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		{#if directed && geo.arrowPoints}
			<polygon
				points={geo.arrowPoints}
				fill={colour}
				stroke={colour}
				stroke-width="0.75"
				stroke-linejoin="round"
			/>
		{/if}
		{#if geo.midPoint}
			<text
				x={geo.midPoint.x}
				y={geo.midPoint.y}
				text-anchor="middle"
				dominant-baseline="middle"
				class="edge-label"
				style="pointer-events: none; user-select: none;"
			>
				{edge.label}
			</text>
		{/if}
	</g>
{/if}

<style>
	.iso-edge {
		animation: edge-fade-in 0.45s ease-out both;
	}

	.edge-spine--dashed {
		stroke-dasharray: 4 4;
	}

	@keyframes edge-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.edge-label {
		font-family: system-ui, sans-serif;
		font-size: 9px;
		fill: var(--text-secondary, #8b949e);
		paint-order: stroke fill;
		stroke: var(--background, #0d1117);
		stroke-width: 2px;
		stroke-linejoin: round;
	}
</style>
