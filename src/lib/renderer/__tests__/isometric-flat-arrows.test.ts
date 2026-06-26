import { describe, it, expect } from 'vitest';
import { flatArrowPath, flatArrowHead, isoToScreen, arrowHead } from '../isometric.js';
import { cfg } from './helpers.js';

describe('flatArrowPath', () => {
	it('produces a single-segment M...L path', () => {
		const path = flatArrowPath(0, 0, 1, 0, 0, cfg);
		expect(path).toMatch(/^M /);
		expect((path.match(/ L /g) ?? []).length).toBe(1);
	});

	it('start point matches isoToScreen of from coords', () => {
		const from = isoToScreen(0, 0, 0, cfg);
		const path = flatArrowPath(0, 0, 1, 0, 0, cfg);
		expect(path).toContain(`M ${from.x},${from.y}`);
	});

	it('end point matches isoToScreen of to coords', () => {
		const to = isoToScreen(3, 2, 0, cfg);
		const path = flatArrowPath(0, 0, 3, 2, 0, cfg);
		expect(path).toContain(`L ${to.x},${to.y}`);
	});

	it('z elevation shifts both endpoints upward on screen', () => {
		const ground = flatArrowPath(0, 0, 1, 1, 0, cfg);
		const raised = flatArrowPath(0, 0, 1, 1, 2, cfg);
		expect(ground).not.toBe(raised);
	});
});

describe('flatArrowHead', () => {
	it('returns four space-separated coordinate pairs (barbed chevron)', () => {
		const points = flatArrowHead(0, 0, 1, 1, 0, cfg);
		const parts = points.split(' ');
		expect(parts.length).toBe(4);
		for (const p of parts) {
			expect(p).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
		}
	});

	it('tip stays at isoToScreen of to position (flat arrows are never buried)', () => {
		const expected = isoToScreen(2, 1, 0, cfg);
		const [tipStr] = flatArrowHead(0, 0, 2, 1, 0, cfg).split(' ');
		const [tx, ty] = tipStr.split(',').map(Number);
		expect(tx).toBeCloseTo(expected.x, 5);
		expect(ty).toBeCloseTo(expected.y, 5);
	});

	it('produces four distinct vertices', () => {
		const coords = flatArrowHead(0, 0, 2, 0, 0, cfg).split(' ');
		expect(coords.length).toBe(4);
		expect(new Set(coords).size).toBe(4);
	});

	it('barbs reach farther from the tip than an edge arrowhead', () => {
		// Flat arrowheads are sized larger (0.3 × tile) than edge ones (0.26 × tile).
		const flat = flatArrowHead(0, 0, 1, 1, 0, cfg)
			.split(' ')
			.map((p) => p.split(',').map(Number));
		const edge = arrowHead(1, 1, 0, 0, 0, cfg)
			.split(' ')
			.map((p) => p.split(',').map(Number));
		const dist = ([a, b]: number[], [c, d]: number[]) => Math.hypot(a - c, b - d);
		expect(dist(flat[0], flat[1])).toBeGreaterThan(dist(edge[0], edge[1]));
	});
});
