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
	const opacity = $derived(arrow.style?.opacity ?? 0.85);
	const geo = $derived(flatArrowGeometry(arrow, tileSize));
</script>

<g
	class="iso-flat-arrow"
	filter="url(#iso-edge-glow)"
	style="transform: translate({offsetX}px, {offsetY}px)"
>
	<!-- Ribbon band lying flat on the ground -->
	<path
		d={geo.path}
		class="flat-arrow-band"
		fill={colour}
		fill-opacity={opacity}
		stroke={colour}
		stroke-opacity="0.95"
		stroke-width="0.75"
		stroke-linejoin="round"
	/>
	<!-- Gloss spine down the ribbon's centre -->
	<path
		d={geo.spine}
		class="flat-arrow-spine"
		fill="none"
		stroke="#ffffff"
		stroke-opacity="0.3"
		stroke-width="1.25"
		stroke-linecap="round"
	/>
	{#if directed && geo.arrowPoints}
		<polygon
			points={geo.arrowPoints}
			fill={colour}
			fill-opacity={opacity}
			stroke={colour}
			stroke-width="0.75"
			stroke-linejoin="round"
		/>
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
	.iso-flat-arrow {
		animation: flat-arrow-fade-in 0.45s ease-out both;
	}

	@keyframes flat-arrow-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
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
