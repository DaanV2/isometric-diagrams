import type { DiagramNode } from './types.js';

/**
 * Assigns isometric grid positions to nodes using a simple row-based layout.
 * Nodes are placed left-to-right, wrapping into new rows every `columns` items.
 * Each cell is spaced by `spacing` grid units.
 */
export function assignGridPositions(nodes: DiagramNode[], columns = 4, spacing = 3): DiagramNode[] {
	return nodes.map((node, i) => ({
		...node,
		position: {
			x: (i % columns) * spacing,
			y: Math.floor(i / columns) * spacing
		}
	}));
}

/**
 * Assigns positions while keeping nodes that share the same group close together.
 * Groups are laid out in separate row bands.
 */
export function assignGroupedPositions(
	nodes: DiagramNode[],
	groupMap: Map<string, string[]>, // groupId -> nodeIds
	columns = 4,
	spacing = 3
): DiagramNode[] {
	const positioned = new Map<string, { x: number; y: number }>();
	let rowOffset = 0;

	for (const [, nodeIds] of groupMap) {
		nodeIds.forEach((id, i) => {
			positioned.set(id, {
				x: (i % columns) * spacing,
				y: rowOffset + Math.floor(i / columns) * spacing
			});
		});
		const rowsUsed = Math.ceil(nodeIds.length / columns);
		rowOffset += rowsUsed * spacing + spacing; // extra gap between groups
	}

	// Any nodes not in a group get appended at the end
	const ungrouped = nodes.filter((n) => !positioned.has(n.id));
	ungrouped.forEach((node, i) => {
		positioned.set(node.id, {
			x: (i % columns) * spacing,
			y: rowOffset + Math.floor(i / columns) * spacing
		});
	});

	return nodes.map((node) => {
		const pos = positioned.get(node.id) ?? { x: 0, y: 0 };
		return { ...node, position: pos };
	});
}
