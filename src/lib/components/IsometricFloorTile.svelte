<script lang="ts">
	import type { DiagramFloorTile } from '../types/diagram.js';
	import { floorTileGeometry } from '../renderer/shapes.js';

	interface Props {
		tile: DiagramFloorTile;
		tileSize: number;
		offsetX: number;
		offsetY: number;
	}

	let { tile, tileSize, offsetX, offsetY }: Props = $props();

	const fillColour = $derived(tile.style?.fillColor ?? tile.style?.color ?? 'transparent');
	const strokeColour = $derived(tile.style?.strokeColor ?? tile.style?.color ?? '#718096');
	const geo = $derived(floorTileGeometry(tile, tileSize));
</script>

<g
	class="iso-floor-tile"
	style="transform: translate({offsetX}px, {offsetY}px)"
>
	<path
		d={geo.path}
		fill={fillColour}
		stroke={strokeColour}
		stroke-width="1.5"
		stroke-dasharray={tile.style?.fillColor ? undefined : '6,3'}
		opacity={tile.style?.opacity ?? 0.6}
	/>
	{#if geo.labelPos}
		<text
			x={geo.labelPos.x}
			y={geo.labelPos.y}
			text-anchor="middle"
			dominant-baseline="middle"
			class="floor-tile-label"
			style="pointer-events: none; user-select: none;"
		>
			{tile.label}
		</text>
	{/if}
</g>

<style>
	.floor-tile-label {
		font-family: system-ui, sans-serif;
		font-size: 10px;
		font-weight: 600;
		fill: var(--text-secondary, #8b949e);
		paint-order: stroke fill;
		stroke: var(--background, #0d1117);
		stroke-width: 2px;
		stroke-linejoin: round;
	}
</style>
