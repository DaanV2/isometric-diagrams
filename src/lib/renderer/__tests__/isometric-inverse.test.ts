import { describe, it, expect } from 'vitest';
import { isoToScreen, screenToIso } from '../isometric.js';
import { TILE, cfg } from './helpers.js';

describe('screenToIso', () => {
	it('is the exact inverse of isoToScreen at z = 0', () => {
		for (const [gx, gy] of [
			[0, 0],
			[3, 5],
			[-2, 4],
			[7, -1]
		]) {
			const s = isoToScreen(gx, gy, 0, cfg);
			const back = screenToIso(s.x, s.y, 0, cfg);
			expect(back.gx).toBeCloseTo(gx, 10);
			expect(back.gy).toBeCloseTo(gy, 10);
		}
	});

	it('round-trips when the point has a known z elevation', () => {
		const s = isoToScreen(2, 3, 2, cfg);
		const back = screenToIso(s.x, s.y, 2, cfg);
		expect(back.gx).toBeCloseTo(2, 10);
		expect(back.gy).toBeCloseTo(3, 10);
	});

	it('maps the origin to (0,0)', () => {
		expect(screenToIso(0, 0, 0, cfg)).toEqual({ gx: 0, gy: 0 });
	});

	it('returns fractional coordinates for off-grid points (caller rounds to snap)', () => {
		// Halfway between (0,0) and (1,0) on screen.
		const mid = { x: TILE / 2, y: TILE / 4 };
		const { gx, gy } = screenToIso(mid.x, mid.y, 0, cfg);
		expect(gx).toBeCloseTo(0.5, 10);
		expect(gy).toBeCloseTo(0, 10);
	});
});
