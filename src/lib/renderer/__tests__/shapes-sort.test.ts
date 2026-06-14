import { describe, it, expect } from 'vitest';
import { sortEdgesByDepth } from '../shapes.js';
import { makeNode, makeEdge } from './helpers.js';
import type { DiagramNode } from '../../types/diagram.js';

function nodeMap(...nodes: DiagramNode[]): Map<string, DiagramNode> {
	return new Map(nodes.map((n) => [n.id, n]));
}

describe('sortEdgesByDepth', () => {
	it('returns an empty array when given no edges', () => {
		expect(sortEdgesByDepth([], new Map())).toEqual([]);
	});

	it('returns a single edge unchanged', () => {
		const map = nodeMap(makeNode('a', 1, 1), makeNode('b', 2, 2));
		expect(sortEdgesByDepth([makeEdge('a', 'b')], map)).toEqual([makeEdge('a', 'b')]);
	});

	it('sorts a far edge before a near edge (back-to-front painter order)', () => {
		// In isometric projection, lower x+y = farther from viewer.
		// far:  a(0,0) → b(1,1) — avg depth = (0+0+1+1)/2 = 1
		// near: c(3,3) → d(4,4) — avg depth = (3+3+4+4)/2 = 7
		const map = nodeMap(
			makeNode('a', 0, 0), makeNode('b', 1, 1),
			makeNode('c', 3, 3), makeNode('d', 4, 4)
		);
		const edges = [makeEdge('c', 'd'), makeEdge('a', 'b')]; // deliberately reversed
		const sorted = sortEdgesByDepth(edges, map);
		expect(sorted[0]).toEqual(makeEdge('a', 'b')); // far (depth 1) first
		expect(sorted[1]).toEqual(makeEdge('c', 'd')); // near (depth 7) last
	});

	it('does not mutate the original array', () => {
		const map = nodeMap(makeNode('a', 0, 0), makeNode('b', 5, 5));
		const edges = [makeEdge('a', 'b')];
		const original = [...edges];
		sortEdgesByDepth(edges, map);
		expect(edges).toEqual(original);
	});

	it('treats unknown node references as depth 0', () => {
		const map = nodeMap(makeNode('a', 5, 5), makeNode('b', 6, 6));
		const edges = [makeEdge('a', 'b'), makeEdge('x', 'y')];
		const sorted = sortEdgesByDepth(edges, map);
		// x+y (unknown → 0) comes before a+b (depth 11)
		expect(sorted[0]).toEqual(makeEdge('x', 'y'));
		expect(sorted[1]).toEqual(makeEdge('a', 'b'));
	});

	it('returns all edges when given equal-depth pairs', () => {
		const map = nodeMap(
			makeNode('a', 1, 0), makeNode('b', 0, 1),
			makeNode('c', 2, 0), makeNode('d', 0, 2)
		);
		const edges = [makeEdge('a', 'b'), makeEdge('c', 'd')];
		expect(sortEdgesByDepth(edges, map)).toHaveLength(2);
	});
});
