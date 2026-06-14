import { describe, it, expect } from 'vitest';
import { floorTileGeometry } from '../shapes.js';
import { isoToScreen } from '../isometric.js';
import { TILE, makeTile } from './helpers.js';

describe('floorTileGeometry', () => {
	it('path is a closed 4-vertex diamond path', () => {
		const { path } = floorTileGeometry(makeTile(0, 0), TILE);
		expect(path).toMatch(/^M /);
		expect(path).toMatch(/Z$/);
		expect((path.match(/ L /g) ?? []).length).toBe(3);
	});

	it('no label → labelPos is null', () => {
		expect(floorTileGeometry(makeTile(0, 0), TILE).labelPos).toBeNull();
	});

	it('with label → labelPos is a ScreenPoint', () => {
		const { labelPos } = floorTileGeometry(makeTile(0, 0, { label: 'Zone A' }), TILE);
		expect(labelPos).toHaveProperty('x');
		expect(labelPos).toHaveProperty('y');
	});

	it('labelPos for a 1×1 tile is the tile centre', () => {
		const { labelPos } = floorTileGeometry(makeTile(2, 3, { label: 'x' }), TILE);
		const expected = isoToScreen(2, 3, 0, { tileSize: TILE });
		expect(labelPos!.x).toBeCloseTo(expected.x, 5);
		expect(labelPos!.y).toBeCloseTo(expected.y, 5);
	});

	it('labelPos for a 3×3 tile is at the centre grid position', () => {
		const { labelPos } = floorTileGeometry(makeTile(0, 0, { width: 3, depth: 3, label: 'x' }), TILE);
		// Centre of a 3×3 tile starting at (0,0) is at grid (1,1)
		const expected = isoToScreen(1, 1, 0, { tileSize: TILE });
		expect(labelPos!.x).toBeCloseTo(expected.x, 5);
		expect(labelPos!.y).toBeCloseTo(expected.y, 5);
	});

	it('width and depth default to 1 when not provided', () => {
		const withDefaults = floorTileGeometry(makeTile(0, 0), TILE);
		const explicit = floorTileGeometry(makeTile(0, 0, { width: 1, depth: 1 }), TILE);
		expect(withDefaults.path).toBe(explicit.path);
	});

	it('larger tile produces a wider path bounding box', () => {
		const small = floorTileGeometry(makeTile(0, 0, { width: 1, depth: 1 }), TILE);
		const large = floorTileGeometry(makeTile(0, 0, { width: 3, depth: 3 }), TILE);
		const maxNum = (path: string) =>
			Math.max(...(path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []));
		expect(maxNum(large.path)).toBeGreaterThan(maxNum(small.path));
	});
});
