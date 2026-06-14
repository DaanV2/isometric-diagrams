import { describe, it, expect } from 'vitest';
import { groupBoundary } from '../shapes.js';
import { isoToScreen } from '../isometric.js';
import { TILE, makeNode } from './helpers.js';

describe('groupBoundary', () => {
	it('returns null for an empty node list', () => {
		expect(groupBoundary([], TILE)).toBeNull();
	});

	it('returns points, labelX, and labelY for a single node', () => {
		const result = groupBoundary([makeNode('a', 2, 3)], TILE);
		expect(result).toHaveProperty('points');
		expect(result).toHaveProperty('labelX');
		expect(result).toHaveProperty('labelY');
	});

	it('points string contains exactly 4 coordinate pairs', () => {
		const result = groupBoundary([makeNode('a', 0, 0)], TILE)!;
		const pairs = result.points.trim().split(/\s+/);
		expect(pairs.length).toBe(4);
		for (const p of pairs) {
			expect(p).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
		}
	});

	it('labelX/labelY come from the top-corner screen position', () => {
		const result = groupBoundary([makeNode('a', 2, 3)], TILE)!;
		// gpad=1: minGX=2-1=1, minGY=3-1=2, zTop=0+NODE_HEIGHT=1
		const top = isoToScreen(1, 2, 1, { tileSize: TILE });
		expect(result.labelX).toBeCloseTo(top.x, 5);
		expect(result.labelY).toBeCloseTo(top.y + 14, 5);
	});

	it('larger group of nodes expands the boundary', () => {
		const small = groupBoundary([makeNode('a', 0, 0)], TILE)!;
		const large = groupBoundary([makeNode('a', 0, 0), makeNode('b', 4, 4)], TILE)!;
		const maxCoord = (b: { points: string }) =>
			Math.max(...b.points.split(/[ ,]/).map(Number));
		expect(maxCoord(large)).toBeGreaterThan(maxCoord(small));
	});

	it('custom gpad increases the boundary size', () => {
		const node = makeNode('a', 2, 2);
		const tight = groupBoundary([node], TILE, 0)!;
		const padded = groupBoundary([node], TILE, 2)!;
		const maxAbs = (b: { points: string }) =>
			Math.max(...b.points.split(/[ ,]/).map(Number).map(Math.abs));
		expect(maxAbs(padded)).toBeGreaterThan(maxAbs(tight));
	});

	it('higher z nodes raise the boundary labelY (smaller screen y)', () => {
		const ground = groupBoundary([makeNode('a', 0, 0, 0)], TILE)!;
		const raised = groupBoundary([makeNode('a', 0, 0, 3)], TILE)!;
		expect(raised.labelY).toBeLessThan(ground.labelY);
	});
});
