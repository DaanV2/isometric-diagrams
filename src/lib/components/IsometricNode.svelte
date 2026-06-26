<script lang="ts">
	import type { DiagramNode } from '../types/diagram.js';
	import { nodeBox } from '../renderer/shapes.js';
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

	const colours = $derived(getNodeColours(node.type));
	const hasIcon = $derived(Boolean(colours.icon?.trim()));
	const opacity = $derived(node.style?.opacity ?? 1);
	const box = $derived(nodeBox(node, tileSize));

	const strokeWidth = $derived(selected ? 2.25 : 1.25);
	const strokeColour = $derived(selected ? '#fde047' : (node.style?.strokeColor ?? colours.stroke));
	const topFill = $derived(node.style?.fillColor ?? colours.top);
	const leftFill = $derived(node.style?.color ?? colours.left);
	const rightFill = $derived(node.style?.color ?? colours.right);

	// Icon plate radii — a flat disc lying on the top face for contrast.
	const plateRx = $derived(tileSize * 0.36);
	const plateRy = $derived(tileSize * 0.18);

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
	style="transform: translate({offsetX}px, {offsetY}px); cursor: pointer; opacity: {opacity};"
>
	<!-- Soft contact shadow on the ground -->
	<path d={box.shadow} class="node-shadow" filter="url(#iso-soft-shadow)" />

	<!-- Left face (shadowed side) -->
	<path d={box.left} fill={leftFill} stroke={strokeColour} stroke-width={strokeWidth} stroke-linejoin="round" />
	<path d={box.left} fill="url(#iso-face-shade)" stroke="none" />
	<!-- Right face (lit side) -->
	<path d={box.right} fill={rightFill} stroke={strokeColour} stroke-width={strokeWidth} stroke-linejoin="round" />
	<path d={box.right} fill="url(#iso-face-shade)" stroke="none" />
	<!-- Top face (brightest) -->
	<path d={box.top} fill={topFill} stroke={strokeColour} stroke-width={strokeWidth} stroke-linejoin="round" />
	<!-- Top-face inner highlight to catch the light -->
	<path d={box.top} fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1" />

	<!-- Icon resting on the top face -->
	{#if hasIcon}
		<ellipse
			cx={box.iconPos.x}
			cy={box.iconPos.y}
			rx={plateRx}
			ry={plateRy}
			class="icon-plate"
		/>
		<text
			x={box.iconPos.x}
			y={box.iconPos.y}
			text-anchor="middle"
			dominant-baseline="central"
			font-size={tileSize * 0.4}
			class="node-icon"
			style="pointer-events: none; user-select: none;"
		>
			{colours.icon}
		</text>
	{/if}

	<!-- Label below the block -->
	<text
		x={box.labelPos.x}
		y={box.labelPos.y}
		text-anchor="middle"
		dominant-baseline="middle"
		class="node-label"
		style="pointer-events: none; user-select: none;"
	>
		{node.label}
	</text>
	{#if node.description}
		<text
			x={box.labelPos.x}
			y={box.labelPos.y + tileSize * 0.2}
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
	.iso-node {
		transition: opacity 0.15s ease;
	}
	.iso-node:focus {
		outline: none;
	}
	.iso-node.selected {
		filter: drop-shadow(0 0 6px rgba(253, 224, 71, 0.55));
	}
	.node-shadow {
		fill: var(--shadow, rgba(0, 0, 0, 0.45));
	}
	.icon-plate {
		fill: rgba(8, 12, 20, 0.32);
		stroke: rgba(255, 255, 255, 0.16);
		stroke-width: 1;
	}
	.node-label {
		font-family: system-ui, sans-serif;
		font-size: 11.5px;
		font-weight: 650;
		fill: var(--text, #eef2f8);
		paint-order: stroke fill;
		stroke: var(--background, #0a0e16);
		stroke-width: 3.5px;
		stroke-linejoin: round;
	}
	.node-desc {
		font-family: system-ui, sans-serif;
		font-size: 9px;
		fill: var(--text-secondary, #8b97a8);
		paint-order: stroke fill;
		stroke: var(--background, #0a0e16);
		stroke-width: 2.5px;
		stroke-linejoin: round;
	}
	.node-icon {
		font-family: system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
		paint-order: stroke fill;
		stroke: rgba(8, 12, 20, 0.45);
		stroke-width: 1.5px;
	}
</style>
