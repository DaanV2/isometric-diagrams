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
	it('returns three space-separated coordinate pairs', () => {
		const points = flatArrowHead(0, 0, 1, 1, 0, cfg);
		const parts = points.split(' ');
		expect(parts.length).toBe(3);
		for (const p of parts) {
			expect(p).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
		}
	});

	it('tip is at isoToScreen of to position', () => {
		const expected = isoToScreen(2, 1, 0, cfg);
		const [tipStr] = flatArrowHead(0, 0, 2, 1, 0, cfg).split(' ');
		const [tx, ty] = tipStr.split(',').map(Number);
		expect(tx).toBeCloseTo(expected.x, 5);
		expect(ty).toBeCloseTo(expected.y, 5);
	});

	it('produces a non-degenerate triangle', () => {
		const coords = flatArrowHead(0, 0, 2, 0, 0, cfg)
			.split(' ')
			.map((p) => p.split(',').map(Number));
		const [tip, b1, b2] = coords;
		expect(tip).not.toEqual(b1);
		expect(tip).not.toEqual(b2);
		expect(b1).not.toEqual(b2);
	});

	it('is larger than edgePath arrowHead (size 10 vs size 8)', () => {
		// flatArrowHead uses size=10, arrowHead uses size=8 — base should be farther from tip
		const flat = flatArrowHead(0, 0, 1, 0, 0, cfg)
			.split(' ')
			.map((p) => p.split(',').map(Number));
		const edge = arrowHead(1, 0, 0, 0, 0, cfg)
			.split(' ')
			.map((p) => p.split(',').map(Number));
		const dist = ([a, b]: number[], [c, d]: number[]) => Math.hypot(a - c, b - d);
		expect(dist(flat[0], flat[1])).toBeGreaterThan(dist(edge[0], edge[1]));
	});
});
