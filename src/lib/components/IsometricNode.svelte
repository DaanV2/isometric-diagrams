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
	const baseOpacity = $derived(node.style?.opacity ?? 1);
	const box = $derived(nodeBox(node, tileSize));

	const strokeWidth = $derived(selected ? 2.5 : 1.5);
	const strokeColour = $derived(
		selected ? '#f6e05e' : (node.style?.strokeColor ?? colours.stroke)
	);
	const topFill = $derived(node.style?.fillColor ?? colours.top);
	const leftFill = $derived(node.style?.color ?? colours.left);
	const rightFill = $derived(node.style?.color ?? colours.right);
	const topFillOpacity = $derived(baseOpacity * (hasIcon ? 0.16 : 1));
	const leftFillOpacity = $derived(baseOpacity * (hasIcon ? 0.2 : 1));
	const rightFillOpacity = $derived(baseOpacity * (hasIcon ? 0.26 : 1));
	const highlightOpacity = $derived(hasIcon ? 0.4 : 0);

	function handleClick() {
		onclick?.(node.id);
	}
</script>

<g
	class="iso-node"
	class:has-icon={hasIcon}
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
	<path
		d={box.left}
		fill={leftFill}
		fill-opacity={leftFillOpacity}
		stroke={strokeColour}
		stroke-width={strokeWidth}
	/>
	<!-- Right face -->
	<path
		d={box.right}
		fill={rightFill}
		fill-opacity={rightFillOpacity}
		stroke={strokeColour}
		stroke-width={strokeWidth}
	/>
	<!-- Top face -->
	<path
		d={box.top}
		fill={topFill}
		fill-opacity={topFillOpacity}
		stroke={strokeColour}
		stroke-width={strokeWidth}
	/>
	{#if hasIcon}
		<path
			d={box.top}
			fill="none"
			stroke="#ffffff"
			stroke-opacity={highlightOpacity}
			stroke-width="1"
		/>
		<path
			d={box.right}
			fill="none"
			stroke="#ffffff"
			stroke-opacity={highlightOpacity * 0.6}
			stroke-width="1"
		/>
	{/if}

	<!-- Icon in the centre of the box -->
	{#if hasIcon}
		<text
			x={box.iconPos.x}
			y={box.iconPos.y}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={tileSize * 0.42}
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
		paint-order: stroke fill;
		stroke: rgba(13, 17, 23, 0.55);
		stroke-width: 2px;
	}
</style>
