<script lang="ts">
	import type { DiagramFlatArrow } from '../types/diagram.js';
	import { flatArrowPath, flatArrowHead, isoToScreen } from '../renderer/isometric.js';

	interface Props {
		arrow: DiagramFlatArrow;
		tileSize: number;
		offsetX: number;
		offsetY: number;
	}

	let { arrow, tileSize, offsetX, offsetY }: Props = $props();

	const z = $derived(arrow.from.z ?? 0);
	const colour = $derived(arrow.style?.color ?? '#f6ad55');
	const directed = $derived(arrow.directed !== false); // default true

	const path = $derived(
		flatArrowPath(arrow.from.x, arrow.from.y, arrow.to.x, arrow.to.y, z, { tileSize })
	);

	const arrowPts = $derived(() => {
		if (!directed) return '';
		return flatArrowHead(arrow.from.x, arrow.from.y, arrow.to.x, arrow.to.y, z, { tileSize });
	});

	const midLabel = $derived(() => {
		if (!arrow.label) return null;
		return isoToScreen(
			(arrow.from.x + arrow.to.x) / 2,
			(arrow.from.y + arrow.to.y) / 2,
			z,
			{ tileSize }
		);
	});
</script>

<g
	class="iso-flat-arrow"
	style="transform: translate({offsetX}px, {offsetY}px)"
>
	<path
		d={path}
		fill="none"
		stroke={colour}
		stroke-width="2"
		opacity={arrow.style?.opacity ?? 0.9}
	/>
	{#if directed}
		<polygon points={arrowPts()} fill={colour} opacity={arrow.style?.opacity ?? 0.9} />
	{/if}
	{#if arrow.label}
		{@const pos = midLabel()}
		{#if pos}
			<text
				x={pos.x}
				y={pos.y - 6}
				text-anchor="middle"
				dominant-baseline="middle"
				class="flat-arrow-label"
				style="pointer-events: none; user-select: none;"
			>
				{arrow.label}
			</text>
		{/if}
	{/if}
</g>

<style>
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
