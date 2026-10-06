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

	it('label midPoint is anchored on the L-shaped route (at the elbow), not the diagonal', () => {
		const { midPoint } = edgeGeometry(from, to, false, true, TILE);
		// Route (0,0)→(2,0)→(2,2): equal legs, so the arc-length midpoint is the elbow.
		const elbow = isoToScreen(2, 0, 0, { tileSize: TILE });
		expect(midPoint!.x).toBeCloseTo(elbow.x, 5);
		expect(midPoint!.y).toBeCloseTo(elbow.y, 5);
		// And it is NOT on the straight diagonal midpoint.
		const diagonal = isoToScreen(1, 1, 0, { tileSize: TILE });
		expect(Math.hypot(midPoint!.x - diagonal.x, midPoint!.y - diagonal.y)).toBeGreaterThan(1);
	});

	it('straight (same-row) edge anchors its label at the leg midpoint', () => {
		const { midPoint } = edgeGeometry(makeNode('a', 0, 0), makeNode('b', 4, 0), false, true, TILE);
		const expected = isoToScreen(2, 0, 0, { tileSize: TILE });
		expect(midPoint!.x).toBeCloseTo(expected.x, 5);
		expect(midPoint!.y).toBeCloseTo(expected.y, 5);
	});

	it('arrowhead length is clamped for adjacent nodes so it does not overshoot the source', () => {
		// Adjacent nodes: the inset eats most of the route, leaving a short last leg.
		const { arrowPoints } = edgeGeometry(makeNode('a', 0, 0), makeNode('b', 0, 1), true, false, TILE);
		const tip = isoToScreen(0, 1, 0, { tileSize: TILE });
		const source = isoToScreen(0, 0, 0, { tileSize: TILE });
		// Every arrowhead vertex must stay between the source and the destination —
		// none may sit beyond the source cube.
		const dist = (p: string) => {
			const [x, y] = p.split(',').map(Number);
			return Math.hypot(x - tip.x, y - tip.y);
		};
		const srcDist = Math.hypot(source.x - tip.x, source.y - tip.y);
		for (const v of arrowPoints.split(' ')) {
			expect(dist(v)).toBeLessThanOrEqual(srcDist + 1e-6);
		}
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
