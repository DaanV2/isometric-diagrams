import { describe, it, expect } from 'vitest';
import { edgePath, arrowHead, isoToScreen } from '../isometric.js';
import { cfg } from './helpers.js';

describe('edgePath', () => {
	it('produces a two-segment M...L...L path', () => {
		const path = edgePath(0, 0, 0, 1, 1, 0, cfg);
		expect(path).toMatch(/^M /);
		expect((path.match(/ L /g) ?? []).length).toBe(2);
	});

	it('start point is at fromZ+0.5 elevation', () => {
		// isoToScreen(0,0,0.5) = {x:0, y:(0+0)*50-0.5*100} = {x:0, y:-50}
		const path = edgePath(0, 0, 0, 0, 0, 0, cfg);
		expect(path).toMatch(/^M 0,-50/);
	});

	it('produces three distinct segments when from ≠ to', () => {
		const path = edgePath(0, 0, 0, 2, 0, 0, cfg);
		expect(path.split(' L ').length).toBe(3);
	});

	it('different z levels produce different paths', () => {
		const flat = edgePath(0, 0, 0, 2, 2, 0, cfg);
		const raised = edgePath(0, 0, 2, 2, 2, 2, cfg);
		expect(flat).not.toBe(raised);
	});
});

describe('arrowHead', () => {
	it('returns three space-separated coordinate pairs', () => {
		const points = arrowHead(1, 1, 0, 0, 0, cfg);
		const parts = points.split(' ');
		expect(parts.length).toBe(3);
		for (const p of parts) {
			expect(p).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
		}
	});

	it('tip is at isoToScreen(toX, toY, toZ+0.5)', () => {
		const expected = isoToScreen(1, 1, 0.5, cfg);
		const [tipStr] = arrowHead(1, 1, 0, 0, 0, cfg).split(' ');
		const [tx, ty] = tipStr.split(',').map(Number);
		expect(tx).toBeCloseTo(expected.x, 5);
		expect(ty).toBeCloseTo(expected.y, 5);
	});

	it('produces a non-degenerate triangle when toY ≠ fromY', () => {
		// Use toY=2 ≠ fromY=0 so tip ≠ base (base = isoToScreen(toX, fromY, ...))
		const coords = arrowHead(2, 2, 0, 0, 0, cfg)
			.split(' ')
			.map((p) => p.split(',').map(Number));
		const [tip, b1, b2] = coords;
		expect(tip).not.toEqual(b1);
		expect(tip).not.toEqual(b2);
		expect(b1).not.toEqual(b2);
	});

	it('does not throw when direction is zero-length (uses len||1 fallback)', () => {
		expect(() => arrowHead(0, 0, 0, 0, 0, cfg)).not.toThrow();
	});
});
