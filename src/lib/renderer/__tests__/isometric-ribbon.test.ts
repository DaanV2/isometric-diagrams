import { describe, it, expect } from 'vitest';
import {
	ribbonPath,
	polylinePath,
	ribbonArrowHead,
	insetRouteEnds,
	isoToScreen,
	type GridPoint
} from '../isometric.js';
import { cfg } from './helpers.js';

const A: GridPoint = { x: 0, y: 0 };
const C: GridPoint = { x: 2, y: 0 };
const B: GridPoint = { x: 2, y: 2 };

describe('ribbonPath', () => {
	it('returns a closed M...L...Z outline', () => {
		const path = ribbonPath([A, B], 0, cfg);
		expect(path).toMatch(/^M /);
		expect(path.trim().endsWith('Z')).toBe(true);
	});

	it('produces a band (two parallel offsets) — 4 vertices for a straight segment', () => {
		const path = ribbonPath([A, B], 0, cfg);
		// left[0], left[1], right[1], right[0]
		expect((path.match(/ L /g) ?? []).length).toBe(3);
	});

	it('an L-shaped route yields 6 outline vertices (3 per side)', () => {
		const path = ribbonPath([A, C, B], 0, cfg);
		expect((path.match(/ L /g) ?? []).length).toBe(5);
	});

	it('a wider halfWidth pushes the band edges farther apart', () => {
		const thin = ribbonPath([A, B], 0, cfg, 0.05);
		const thick = ribbonPath([A, B], 0, cfg, 0.3);
		expect(thin).not.toBe(thick);
	});

	it('drops degenerate (duplicate) points instead of breaking', () => {
		const withDup = ribbonPath([A, A, B], 0, cfg);
		const without = ribbonPath([A, B], 0, cfg);
		expect(withDup).toBe(without);
	});

	it('returns empty string for fewer than two distinct points', () => {
		expect(ribbonPath([A], 0, cfg)).toBe('');
		expect(ribbonPath([A, A], 0, cfg)).toBe('');
	});

	it('a higher z lifts the whole band upward on screen', () => {
		const ground = ribbonPath([A, B], 0, cfg);
		const raised = ribbonPath([A, B], 2, cfg);
		expect(ground).not.toBe(raised);
	});
});

describe('polylinePath', () => {
	it('projects the centreline as an M...L path on the ground', () => {
		const spine = polylinePath([A, C, B], 0, cfg);
		expect(spine).toMatch(/^M /);
		expect((spine.match(/ L /g) ?? []).length).toBe(2);
	});

	it('starts at the projection of the first grid point', () => {
		const s = isoToScreen(A.x, A.y, 0, cfg);
		expect(polylinePath([A, B], 0, cfg)).toMatch(new RegExp(`^M ${s.x},${s.y}`));
	});
});

describe('ribbonArrowHead', () => {
	it('returns four space-separated coordinate pairs (barbed chevron)', () => {
		const points = ribbonArrowHead(C, B, 0, cfg);
		const parts = points.split(' ');
		expect(parts.length).toBe(4);
		for (const p of parts) {
			expect(p).toMatch(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/);
		}
	});

	it('tip sits at the projection of the destination grid point', () => {
		const expected = isoToScreen(B.x, B.y, 0, cfg);
		const [tipStr] = ribbonArrowHead(C, B, 0, cfg).split(' ');
		const [tx, ty] = tipStr.split(',').map(Number);
		expect(tx).toBeCloseTo(expected.x, 5);
		expect(ty).toBeCloseTo(expected.y, 5);
	});

	it('produces four distinct vertices', () => {
		const coords = ribbonArrowHead(A, C, 0, cfg).split(' ');
		expect(new Set(coords).size).toBe(4);
	});

	it('a longer length pushes the barbs farther back from the tip', () => {
		const short = ribbonArrowHead(C, B, 0, cfg, 0.3, 0.26).split(' ')[1];
		const long = ribbonArrowHead(C, B, 0, cfg, 0.8, 0.26).split(' ')[1];
		expect(short).not.toBe(long);
	});
});

describe('insetRouteEnds', () => {
	it('pulls the first and last points inward along their end segments', () => {
		const [start, , end] = insetRouteEnds([A, C, B], 0.5, 0.5);
		// First point moves toward C (along +x); last moves toward C (along -y).
		expect(start.x).toBeGreaterThan(A.x);
		expect(start.y).toBeCloseTo(A.y, 5);
		expect(end.y).toBeLessThan(B.y);
		expect(end.x).toBeCloseTo(B.x, 5);
	});

	it('never insets past 90% of a short end segment', () => {
		const short: GridPoint[] = [
			{ x: 0, y: 0 },
			{ x: 0.4, y: 0 }
		];
		const [start, end] = insetRouteEnds(short, 1, 1);
		// Both ends pulled in, but they cannot cross past each other.
		expect(start.x).toBeLessThanOrEqual(end.x);
	});

	it('returns the route unchanged when it has fewer than two points', () => {
		expect(insetRouteEnds([A], 0.5, 0.5)).toEqual([A]);
	});
});
