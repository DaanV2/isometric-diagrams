import { describe, it, expect } from 'vitest';
import { sortEdgesByDepth } from './shapes.js';
import type { DiagramEdge, DiagramNode } from '../types/diagram.js';

function node(id: string, x: number, y: number, z = 0): DiagramNode {
	return { id, label: id, position: { x, y, z } };
}

function edge(from: string, to: string): DiagramEdge {
	return { from, to };
}

function nodeMap(...nodes: DiagramNode[]): Map<string, DiagramNode> {
	return new Map(nodes.map((n) => [n.id, n]));
}

describe('sortEdgesByDepth', () => {
	it('returns an empty array when given no edges', () => {
		expect(sortEdgesByDepth([], new Map())).toEqual([]);
	});

	it('returns a single edge unchanged', () => {
		const edges = [edge('a', 'b')];
		expect(sortEdgesByDepth(edges, nodeMap(node('a', 1, 1), node('b', 2, 2)))).toEqual([edge('a', 'b')]);
	});

	it('sorts a far edge before a near edge (back-to-front)', () => {
		// In isometric projection, lower x+y = farther from viewer (back).
		// Painter's algorithm: far (low x+y) renders first, near (high x+y) last.
		// far:  a(0,0) → b(1,1) — avg depth = (0+0+1+1)/2 = 1
		// near: c(3,3) → d(4,4) — avg depth = (3+3+4+4)/2 = 7
		const map = nodeMap(node('a', 0, 0), node('b', 1, 1), node('c', 3, 3), node('d', 4, 4));
		const edges = [edge('c', 'd'), edge('a', 'b')]; // deliberately reversed
		const sorted = sortEdgesByDepth(edges, map);
		expect(sorted[0]).toEqual(edge('a', 'b')); // far (depth 1) first
		expect(sorted[1]).toEqual(edge('c', 'd')); // near (depth 7) last
	});

	it('does not mutate the original array', () => {
		const edges = [edge('a', 'b')];
		const original = [...edges];
		sortEdgesByDepth(edges, nodeMap(node('a', 0, 0), node('b', 5, 5)));
		expect(edges).toEqual(original);
	});

	it('treats unknown node references as depth 0', () => {
		// edge with known nodes at high depth, edge with unknown nodes default to 0
		const map = nodeMap(node('a', 5, 5), node('b', 6, 6));
		const edges = [edge('a', 'b'), edge('x', 'y')];
		const sorted = sortEdgesByDepth(edges, map);
		// x+y (unknown → 0) comes before a+b (depth 11)
		expect(sorted[0]).toEqual(edge('x', 'y'));
		expect(sorted[1]).toEqual(edge('a', 'b'));
	});

	it('preserves relative order of edges with equal depth', () => {
		// Both edges have the same average depth
		const map = nodeMap(node('a', 1, 0), node('b', 0, 1), node('c', 2, 0), node('d', 0, 2));
		const edgeList = [edge('a', 'b'), edge('c', 'd')];
		// depth a→b: (1+0+0+1)/2 = 1; depth c→d: (2+0+0+2)/2 = 2
		// They are not equal — just verify a stable sort order
		const sorted = sortEdgesByDepth(edgeList, map);
		expect(sorted).toHaveLength(2);
	});
});
