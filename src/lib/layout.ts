/**
 * Automatic node placement for the diagram editor.
 *
 * `autoLayout` assigns grid positions using a layered (Sugiyama-style) layout:
 * nodes are ranked by their longest path from a source along directed edges,
 * each rank becomes a row (y), and nodes within a rank are spread along x and
 * centred. This suits flow/network diagrams; disconnected nodes fall into the
 * first rank. Existing z-elevations are preserved.
 */

import type { DiagramSpec } from './types/diagram.js';

export interface LayoutOptions {
	/** Grid units between adjacent nodes in a row and between rows. Default 2. */
	spacing?: number;
}

export function autoLayout(spec: DiagramSpec, options: LayoutOptions = {}): DiagramSpec {
	const spacing = options.spacing ?? 2;
	const nodes = spec.nodes;
	if (nodes.length === 0) return spec;

	const ids = nodes.map((n) => n.id);
	const idSet = new Set(ids);

	// Build adjacency + in-degree from valid, non-self directed edges.
	const adj = new Map<string, string[]>();
	const indeg = new Map<string, number>();
	for (const id of ids) {
		adj.set(id, []);
		indeg.set(id, 0);
	}
	for (const e of spec.edges ?? []) {
		if (e.from === e.to) continue;
		if (!idSet.has(e.from) || !idSet.has(e.to)) continue;
		adj.get(e.from)!.push(e.to);
		indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
	}

	// Longest-path ranking via Kahn's algorithm (cycle edges are simply ignored
	// once their targets never reach in-degree 0, leaving them at rank 0).
	const rank = new Map<string, number>(ids.map((id) => [id, 0]));
	const remaining = new Map<string, number>(indeg);
	const queue = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
	while (queue.length > 0) {
		const u = queue.shift()!;
		for (const v of adj.get(u)!) {
			rank.set(v, Math.max(rank.get(v) ?? 0, (rank.get(u) ?? 0) + 1));
			remaining.set(v, (remaining.get(v) ?? 1) - 1);
			if ((remaining.get(v) ?? 0) === 0) queue.push(v);
		}
	}

	// Bucket node ids by rank, preserving spec order within each rank.
	const byRank = new Map<number, string[]>();
	for (const id of ids) {
		const r = rank.get(id) ?? 0;
		if (!byRank.has(r)) byRank.set(r, []);
		byRank.get(r)!.push(id);
	}

	// Assign centred, integer positions: rank -> y, index-in-rank -> x.
	const position = new Map<string, { x: number; y: number }>();
	const ranks = [...byRank.keys()].sort((a, b) => a - b);
	ranks.forEach((r, rowIndex) => {
		const row = byRank.get(r)!;
		const offset = Math.floor((row.length - 1) / 2);
		row.forEach((id, i) => {
			position.set(id, { x: (i - offset) * spacing, y: rowIndex * spacing });
		});
	});

	return {
		...spec,
		nodes: nodes.map((n) => {
			const p = position.get(n.id)!;
			return { ...n, position: { ...n.position, x: p.x, y: p.y } };
		})
	};
}
