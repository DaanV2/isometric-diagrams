<script lang="ts">
	import type { DiagramNode } from '../types/diagram.js';
	import { boxPaths, isoToScreen } from '../renderer/isometric.js';
	import { getNodeColours } from '../renderer/theme.js';

	interface Props {
		node: DiagramNode;
		tileSize: number;
		offsetX: number;
		offsetY: number;
		selected?: boolean;
		onclick?: (id: string) => void;
	}

	let { node, tileSize, offsetX, offsetY, selected = false, onclick }: Props = $props();

	const height = 1;
	const colours = $derived(getNodeColours(node.type));
	const paths = $derived(
		boxPaths(node.position.x, node.position.y, node.position.z ?? 0, height, { tileSize })
	);
	const labelPos = $derived(
		isoToScreen(node.position.x, node.position.y, (node.position.z ?? 0) + height + 0.3, {
			tileSize
		})
	);
	const iconPos = $derived(
		isoToScreen(node.position.x, node.position.y, (node.position.z ?? 0) + height, { tileSize })
	);

	const strokeWidth = $derived(selected ? 2.5 : 1.5);
	const strokeColour = $derived(
		selected ? '#f6e05e' : (node.style?.strokeColor ?? colours.stroke)
	);
	const topFill = $derived(node.style?.fillColor ?? colours.top);
	const leftFill = $derived(node.style?.color ?? colours.left);
	const rightFill = $derived(node.style?.color ?? colours.right);

	function handleClick() {
		onclick?.(node.id);
	}
</script>

<g
	class="iso-node"
	class:selected
	data-node-id={node.id}
	role="button"
	tabindex="0"
	aria-label={node.label}
	onclick={handleClick}
	onkeydown={(e) => e.key === 'Enter' && handleClick()}
	style="transform: translate({offsetX}px, {offsetY}px); cursor: pointer;"
>
	<!-- Left face -->
	<path d={paths.left} fill={leftFill} stroke={strokeColour} stroke-width={strokeWidth} />
	<!-- Right face -->
	<path d={paths.right} fill={rightFill} stroke={strokeColour} stroke-width={strokeWidth} />
	<!-- Top face -->
	<path d={paths.top} fill={topFill} stroke={strokeColour} stroke-width={strokeWidth} />

	<!-- Icon in centre of top face -->
	<text
		x={iconPos.x}
		y={iconPos.y - tileSize * 0.15}
		text-anchor="middle"
		dominant-baseline="middle"
		font-size={tileSize * 0.45}
		class="node-icon"
		style="pointer-events: none; user-select: none;"
	>
		{colours.icon}
	</text>

	<!-- Label below the block -->
	<text
		x={labelPos.x}
		y={labelPos.y}
		text-anchor="middle"
		dominant-baseline="middle"
		class="node-label"
		style="pointer-events: none; user-select: none;"
	>
		{node.label}
	</text>
	{#if node.description}
		<text
			x={labelPos.x}
			y={labelPos.y + 13}
			text-anchor="middle"
			dominant-baseline="middle"
			class="node-desc"
			style="pointer-events: none; user-select: none;"
		>
			{node.description}
		</text>
	{/if}
</g>

<style>
	.iso-node:focus {
		outline: none;
	}
	.node-label {
		font-family: system-ui, sans-serif;
		font-size: 11px;
		font-weight: 600;
		fill: var(--text, #e6edf3);
		paint-order: stroke fill;
		stroke: var(--background, #0d1117);
		stroke-width: 3px;
		stroke-linejoin: round;
	}
	.node-desc {
		font-family: system-ui, sans-serif;
		font-size: 9px;
		fill: var(--text-secondary, #8b949e);
		paint-order: stroke fill;
		stroke: var(--background, #0d1117);
		stroke-width: 2px;
		stroke-linejoin: round;
	}
	.node-icon {
		font-family: system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
	}
</style>
