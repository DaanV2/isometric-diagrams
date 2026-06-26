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

	it('rounds the elbow with a quadratic curve for a normal two-leg edge', () => {
		const path = edgePath(0, 0, 0, 2, 2, 0, cfg);
		expect(path).toContain(' Q ');
	});

	it('insets the endpoint short of the destination centre', () => {
		const path = edgePath(0, 0, 0, 2, 2, 0, cfg);
		const rawTo = isoToScreen(2, 2, 0.5, cfg);
		// The connector stops before the node centre so the arrowhead clears the cube.
		expect(path.endsWith(`${rawTo.x},${rawTo.y}`)).toBe(false);
	});

	it('falls back to a sharp elbow when a leg is degenerate', () => {
		const path = edgePath(0, 0, 0, 0, 0, 0, cfg);
		expect(path).not.toContain(' Q ');
		expect((path.match(/ L /g) ?? []).length).toBe(2);
	});
});

describe('arrowHead', () => {
	it('returns four space-separated coordinate pairs (barbed chevron)', () => {
		const points = arrowHead(1, 1, 0, 0, 0, cfg);
		const parts = points.split(' ');
		expect(parts.length).toBe(4);
		for (const p of parts) {
			expect(p).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
		}
	});

	it('tip is inset out of the destination cube toward the source', () => {
		const rawTip = isoToScreen(1, 1, 0.5, cfg);
		const base = isoToScreen(1, 0, 0.5, cfg);
		const [tipStr] = arrowHead(1, 1, 0, 0, 0, cfg).split(' ');
		const [tx, ty] = tipStr.split(',').map(Number);
		// Closer to the source than the raw node centre…
		expect(Math.hypot(tx - base.x, ty - base.y)).toBeLessThan(
			Math.hypot(rawTip.x - base.x, rawTip.y - base.y)
		);
		// …pulled back by tileSize * 0.62 from that centre.
		expect(Math.hypot(tx - rawTip.x, ty - rawTip.y)).toBeCloseTo(cfg.tileSize * 0.62, 5);
	});

	it('produces four distinct vertices when toY ≠ fromY', () => {
		const coords = arrowHead(2, 2, 0, 0, 0, cfg).split(' ');
		expect(coords.length).toBe(4);
		expect(new Set(coords).size).toBe(4);
	});

	it('does not throw when direction is zero-length (uses fallback)', () => {
		expect(() => arrowHead(0, 0, 0, 0, 0, cfg)).not.toThrow();
	});
});
