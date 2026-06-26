<script lang="ts">
	import type { DiagramEdge, DiagramNode } from '../types/diagram.js';
	import { edgeGeometry, type EdgeGeometry } from '../renderer/shapes.js';
	import { getEdgeColour } from '../renderer/theme.js';
	import { drawOnMount } from '../actions/draw-on-mount.js';

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
		style="transform: translate({offsetX}px, {offsetY}px)"
	>
		{#if edge.type === 'dependency'}
			<path
				d={geo.path}
				class="edge-path edge-path--dashed"
				fill="none"
				stroke={colour}
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{:else}
			<path
				use:drawOnMount={geo.path}
				d={geo.path}
				class="edge-path"
				fill="none"
				stroke={colour}
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{/if}
		{#if directed && geo.arrowPoints}
			<polygon points={geo.arrowPoints} fill={colour} opacity="0.85" />
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
	.edge-path {
		opacity: 0.9;
		animation: draw-line 0.8s ease-out forwards;
	}

	.edge-path--dashed {
		stroke-dasharray: 5 3;
		stroke-dashoffset: 0;
		animation: fade-in-edge 0.6s ease-out forwards;
	}

	@keyframes draw-line {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes fade-in-edge {
		from {
			opacity: 0;
		}
		to {
			opacity: 0.85;
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
