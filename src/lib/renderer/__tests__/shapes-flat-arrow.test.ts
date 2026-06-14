import { describe, it, expect } from 'vitest';
import { flatArrowGeometry } from '../shapes.js';
import { isoToScreen } from '../isometric.js';
import { TILE, makeArrow } from './helpers.js';

describe('flatArrowGeometry', () => {
	it('path is a single-segment M...L string', () => {
		const { path } = flatArrowGeometry(makeArrow(0, 0, 2, 2), TILE);
		expect(path).toMatch(/^M /);
		expect((path.match(/ L /g) ?? []).length).toBe(1);
	});

	it('directed by default → arrowPoints non-empty', () => {
		expect(flatArrowGeometry(makeArrow(0, 0, 2, 2), TILE).arrowPoints).not.toBe('');
	});

	it('directed=false → empty arrowPoints', () => {
		expect(
			flatArrowGeometry(makeArrow(0, 0, 2, 2, { directed: false }), TILE).arrowPoints
		).toBe('');
	});

	it('no label → midPoint is null', () => {
		expect(flatArrowGeometry(makeArrow(0, 0, 2, 2), TILE).midPoint).toBeNull();
	});

	it('with label → midPoint is a ScreenPoint', () => {
		const { midPoint } = flatArrowGeometry(makeArrow(0, 0, 2, 2, { label: 'data' }), TILE);
		expect(midPoint).toHaveProperty('x');
		expect(midPoint).toHaveProperty('y');
	});

	it('midPoint is at the average of from and to grid positions', () => {
		const { midPoint } = flatArrowGeometry(makeArrow(0, 0, 2, 0, { label: 'x' }), TILE);
		const expected = isoToScreen(1, 0, 0, { tileSize: TILE });
		expect(midPoint!.x).toBeCloseTo(expected.x, 5);
		expect(midPoint!.y).toBeCloseTo(expected.y, 5);
	});

	it('from.z defaults to 0 when not set', () => {
		const arrow = makeArrow(0, 0, 1, 1);
		const withoutZ = flatArrowGeometry(arrow, TILE);
		const withZ = flatArrowGeometry({ ...arrow, from: { ...arrow.from, z: 0 } }, TILE);
		expect(withoutZ.path).toBe(withZ.path);
	});
});
