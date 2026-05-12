<script lang="ts">
	import type { DiagramFloorTile } from '../types/diagram.js';
	import { floorTilePath, isoToScreen } from '../renderer/isometric.js';

	interface Props {
		tile: DiagramFloorTile;
		tileSize: number;
		offsetX: number;
		offsetY: number;
	}

	let { tile, tileSize, offsetX, offsetY }: Props = $props();

	const gz = $derived(tile.position.z ?? 0);
	const w = $derived(tile.width ?? 1);
	const d = $derived(tile.depth ?? 1);

	const fillColour = $derived(tile.style?.fillColor ?? tile.style?.color ?? 'transparent');
	const strokeColour = $derived(tile.style?.strokeColor ?? tile.style?.color ?? '#718096');

	const path = $derived(
		floorTilePath(tile.position.x, tile.position.y, gz, w, d, { tileSize })
	);

	const labelPos = $derived(() => {
		if (!tile.label) return null;
		// Place the label at the visual centre of the area
		return isoToScreen(
			tile.position.x + (w - 1) / 2,
			tile.position.y + (d - 1) / 2,
			gz,
			{ tileSize }
		);
	});
</script>

<g
	class="iso-floor-tile"
	style="transform: translate({offsetX}px, {offsetY}px)"
>
	<path
		d={path}
		fill={fillColour}
		stroke={strokeColour}
		stroke-width="1.5"
		stroke-dasharray={tile.style?.fillColor ? undefined : '6,3'}
		opacity={tile.style?.opacity ?? 0.6}
	/>
	{#if tile.label}
		{@const pos = labelPos()}
		{#if pos}
			<text
				x={pos.x}
				y={pos.y}
				text-anchor="middle"
				dominant-baseline="middle"
				class="floor-tile-label"
				style="pointer-events: none; user-select: none;"
			>
				{tile.label}
			</text>
		{/if}
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
