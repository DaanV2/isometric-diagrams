import { describe, it, expect } from 'vitest';
import { NODE_HEIGHT, nodeBox } from '../shapes.js';
import { isoToScreen } from '../isometric.js';
import { TILE, makeNode } from './helpers.js';

describe('NODE_HEIGHT', () => {
	it('is 1 grid unit', () => {
		expect(NODE_HEIGHT).toBe(1);
	});
});

describe('nodeBox', () => {
	it('returns top, left, right face paths plus labelPos and iconPos', () => {
		const box = nodeBox(makeNode('a', 0, 0), TILE);
		expect(box).toHaveProperty('top');
		expect(box).toHaveProperty('left');
		expect(box).toHaveProperty('right');
		expect(box).toHaveProperty('labelPos');
		expect(box).toHaveProperty('iconPos');
	});

	it('all three face paths are closed SVG paths', () => {
		const { top, left, right } = nodeBox(makeNode('a', 0, 0), TILE);
		for (const path of [top, left, right]) {
			expect(path).toMatch(/^M /);
			expect(path).toMatch(/Z$/);
		}
	});

	it('labelPos is above the top face (smaller screen y = higher)', () => {
		const box = nodeBox(makeNode('a', 0, 0), TILE);
		const topFaceCenter = isoToScreen(0, 0, NODE_HEIGHT, { tileSize: TILE });
		expect(box.labelPos.y).toBeLessThan(topFaceCenter.y);
	});

	it('iconPos sits within the box height range', () => {
		const box = nodeBox(makeNode('a', 0, 0), TILE);
		const bottom = isoToScreen(0, 0, 0, { tileSize: TILE });
		const top = isoToScreen(0, 0, NODE_HEIGHT, { tileSize: TILE });
		expect(box.iconPos.y).toBeGreaterThanOrEqual(top.y);
		expect(box.iconPos.y).toBeLessThanOrEqual(bottom.y);
	});

	it('position.z defaults to 0 when undefined', () => {
		const withoutZ = nodeBox(makeNode('a', 1, 1), TILE);
		const withZ = nodeBox(makeNode('a', 1, 1, 0), TILE);
		expect(withoutZ.top).toBe(withZ.top);
		expect(withoutZ.labelPos).toEqual(withZ.labelPos);
	});

	it('elevated node has a higher (smaller y) labelPos', () => {
		const ground = nodeBox(makeNode('a', 0, 0, 0), TILE);
		const elevated = nodeBox(makeNode('a', 0, 0, 2), TILE);
		expect(elevated.labelPos.y).toBeLessThan(ground.labelPos.y);
	});

	it('labelPos.x is centred horizontally over the node grid position', () => {
		const box = nodeBox(makeNode('a', 2, 3), TILE);
		const center = isoToScreen(2, 3, 0, { tileSize: TILE });
		expect(box.labelPos.x).toBe(center.x);
	});
});
