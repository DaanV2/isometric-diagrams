import { describe, it, expect } from 'vitest';
import { isoGridLines } from '../shapes.js';
import { TILE, makeNode } from './helpers.js';

describe('isoGridLines', () => {
	it('returns an empty array when there are no nodes', () => {
		expect(isoGridLines([], TILE)).toEqual([]);
	});

	it('every line is an M...L path string', () => {
		for (const line of isoGridLines([makeNode('a', 0, 0)], TILE)) {
			expect(line).toMatch(/^M .+ L .+$/);
		}
	});

	it('single node at origin produces 6 lines (3 x-lines + 3 y-lines)', () => {
		// minGX=−1, maxGX=1 → 3 x-lines; minGY=−1, maxGY=1 → 3 y-lines
		expect(isoGridLines([makeNode('a', 0, 0)], TILE).length).toBe(6);
	});

	it('two spread-out nodes produce more lines than one', () => {
		const few = isoGridLines([makeNode('a', 0, 0)], TILE);
		const many = isoGridLines([makeNode('a', 0, 0), makeNode('b', 3, 3)], TILE);
		expect(many.length).toBeGreaterThan(few.length);
	});

	it('line count equals (xRange + 1) + (yRange + 1) after ±1 extension', () => {
		// nodes at x=0,2 and y=0 → minGX=−1, maxGX=3 → 5 x-lines
		//                        → minGY=−1, maxGY=1  → 3 y-lines  = 8 total
		const nodes = [makeNode('a', 0, 0), makeNode('b', 2, 0)];
		expect(isoGridLines(nodes, TILE).length).toBe(8);
	});
});
