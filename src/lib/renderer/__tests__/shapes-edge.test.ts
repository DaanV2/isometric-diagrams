import { describe, it, expect } from 'vitest';
import { edgeGeometry } from '../shapes.js';
import { isoToScreen } from '../isometric.js';
import { TILE, makeNode } from './helpers.js';

describe('edgeGeometry', () => {
	const from = makeNode('a', 0, 0);
	const to = makeNode('b', 2, 2);

	it('path is a closed filled ribbon band (M...Z)', () => {
		const { path } = edgeGeometry(from, to, false, false, TILE);
		expect(path).toMatch(/^M /);
		expect(path.trim().endsWith('Z')).toBe(true);
	});

	it('spine is an open centreline polyline (M...L...)', () => {
		const { spine } = edgeGeometry(from, to, false, false, TILE);
		expect(spine).toMatch(/^M /);
		expect(spine).not.toContain('Z');
		// L-shaped route → two segments along the spine.
		expect((spine.match(/ L /g) ?? []).length).toBe(2);
	});

	it('undirected edge → empty arrowPoints', () => {
		expect(edgeGeometry(from, to, false, false, TILE).arrowPoints).toBe('');
	});

	it('directed edge → four arrowhead coordinate pairs', () => {
		const { arrowPoints } = edgeGeometry(from, to, true, false, TILE);
		expect(arrowPoints).not.toBe('');
		expect(arrowPoints.split(' ').length).toBe(4);
	});

	it('no label → midPoint is null', () => {
		expect(edgeGeometry(from, to, false, false, TILE).midPoint).toBeNull();
	});

	it('with label → midPoint is a ScreenPoint', () => {
		const { midPoint } = edgeGeometry(from, to, false, true, TILE);
		expect(midPoint).toHaveProperty('x');
		expect(midPoint).toHaveProperty('y');
	});

	it('midPoint is at the average grid position on the ground plane (z=0)', () => {
		const { midPoint } = edgeGeometry(from, to, false, true, TILE);
		const expected = isoToScreen(1, 1, 0, { tileSize: TILE });
		expect(midPoint!.x).toBeCloseTo(expected.x, 5);
		expect(midPoint!.y).toBeCloseTo(expected.y, 5);
	});

	it('position.z defaults to 0 when not provided', () => {
		const noZ = edgeGeometry(from, to, false, false, TILE);
		const withZ = edgeGeometry(makeNode('a', 0, 0, 0), makeNode('b', 2, 2, 0), false, false, TILE);
		expect(noZ.path).toBe(withZ.path);
	});

	it('arrowhead tip is inset short of the destination node centre', () => {
		const { arrowPoints } = edgeGeometry(from, to, true, false, TILE);
		const centre = isoToScreen(2, 2, 0, { tileSize: TILE });
		const corner = isoToScreen(2, 0, 0, { tileSize: TILE });
		const [tipStr] = arrowPoints.split(' ');
		const [tx, ty] = tipStr.split(',').map(Number);
		// Pulled back from the node centre so the arrowhead clears the cube body…
		expect(Math.hypot(tx - centre.x, ty - centre.y)).toBeGreaterThan(1);
		// …along the arriving leg toward the source side (closer to the corner).
		expect(Math.hypot(tx - corner.x, ty - corner.y)).toBeLessThan(
			Math.hypot(centre.x - corner.x, centre.y - corner.y)
		);
	});
});
