<script lang="ts">
	import type { DiagramEdge, DiagramNode } from '../types/diagram.js';
	import { edgePath, arrowHead, isoToScreen } from '../renderer/isometric.js';
	import { getEdgeColour } from '../renderer/theme.js';

	interface Props {
		edge: DiagramEdge;
		nodes: DiagramNode[];
		tileSize: number;
		offsetX: number;
		offsetY: number;
	}

	let { edge, nodes, tileSize, offsetX, offsetY }: Props = $props();

	const fromNode = $derived(nodes.find((n) => n.id === edge.from));
	const toNode = $derived(nodes.find((n) => n.id === edge.to));
	const colour = $derived(edge.style?.color ?? getEdgeColour(edge.type));
	const directed = $derived(edge.directed !== false); // default true

	const path = $derived(() => {
		if (!fromNode || !toNode) return '';
		return edgePath(
			fromNode.position.x,
			fromNode.position.y,
			fromNode.position.z ?? 0,
			toNode.position.x,
			toNode.position.y,
			toNode.position.z ?? 0,
			{ tileSize }
		);
	});

	const arrow = $derived(() => {
		if (!directed || !fromNode || !toNode) return '';
		return arrowHead(
			toNode.position.x,
			toNode.position.y,
			toNode.position.z ?? 0,
			fromNode.position.x,
			fromNode.position.y,
			{ tileSize }
		);
	});

	const midLabel = $derived(() => {
		if (!fromNode || !toNode || !edge.label) return null;
		const s = isoToScreen(
			(fromNode.position.x + toNode.position.x) / 2,
			(fromNode.position.y + toNode.position.y) / 2,
			((fromNode.position.z ?? 0) + (toNode.position.z ?? 0)) / 2 + 0.5,
			{ tileSize }
		);
		return s;
	});
</script>

{#if fromNode && toNode}
	<g
		class="iso-edge"
		data-edge-from={edge.from}
		data-edge-to={edge.to}
		style="transform: translate({offsetX}px, {offsetY}px)"
	>
		<path
			d={path()}
			class={edge.type === 'dependency' ? 'edge-path edge-path--dashed' : 'edge-path'}
			fill="none"
			stroke={colour}
			stroke-width="1.5"
		/>
		{#if directed}
			<polygon points={arrow()} fill={colour} opacity="0.85" />
		{/if}
		{#if edge.label}
			{@const pos = midLabel()}
			{#if pos}
				<text
					x={pos.x}
					y={pos.y}
					text-anchor="middle"
					dominant-baseline="middle"
					class="edge-label"
					style="pointer-events: none; user-select: none;"
				>
					{edge.label}
				</text>
			{/if}
		{/if}
	</g>
{/if}

<style>
	.edge-path {
		opacity: 0.85;
		stroke-dasharray: 1000;
		stroke-dashoffset: 1000;
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
