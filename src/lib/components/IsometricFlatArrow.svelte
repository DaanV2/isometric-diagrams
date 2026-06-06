<script lang="ts">
	import type { DiagramFlatArrow } from '../types/diagram.js';
	import { flatArrowGeometry } from '../renderer/shapes.js';

	interface Props {
		arrow: DiagramFlatArrow;
		tileSize: number;
		offsetX: number;
		offsetY: number;
	}

	let { arrow, tileSize, offsetX, offsetY }: Props = $props();

	const colour = $derived(arrow.style?.color ?? '#f6ad55');
	const directed = $derived(arrow.directed !== false);
	const geo = $derived(flatArrowGeometry(arrow, tileSize));
</script>

<g
	class="iso-flat-arrow"
	style="transform: translate({offsetX}px, {offsetY}px)"
>
	<path
		d={geo.path}
		class="flat-arrow-path"
		fill="none"
		stroke={colour}
		stroke-width="2"
		opacity={arrow.style?.opacity ?? 0.9}
	/>
	{#if directed && geo.arrowPoints}
		<polygon points={geo.arrowPoints} fill={colour} opacity={arrow.style?.opacity ?? 0.9} />
	{/if}
	{#if geo.midPoint}
		<text
			x={geo.midPoint.x}
			y={geo.midPoint.y - 6}
			text-anchor="middle"
			dominant-baseline="middle"
			class="flat-arrow-label"
			style="pointer-events: none; user-select: none;"
		>
			{arrow.label}
		</text>
	{/if}
</g>

<style>
	.flat-arrow-path {
		stroke-dasharray: 1000;
		stroke-dashoffset: 1000;
		animation: draw-flat-arrow 0.8s ease-out forwards;
	}

	@keyframes draw-flat-arrow {
		to {
			stroke-dashoffset: 0;
		}
	}

	.flat-arrow-label {
		font-family: system-ui, sans-serif;
		font-size: 9px;
		fill: var(--text-secondary, #8b949e);
		paint-order: stroke fill;
		stroke: var(--background, #0d1117);
		stroke-width: 2px;
		stroke-linejoin: round;
	}
</style>
