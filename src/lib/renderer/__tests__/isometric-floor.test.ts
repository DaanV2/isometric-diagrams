import { describe, it, expect } from 'vitest';
import { floorTilePath, boundingBox } from '../isometric.js';
import { cfg, pathNumbers } from './helpers.js';

describe('floorTilePath', () => {
	it('produces a closed 4-vertex diamond path', () => {
		const path = floorTilePath(0, 0, 0, 1, 1, cfg);
		expect(path).toMatch(/^M /);
		expect(path).toMatch(/Z$/);
		expect((path.match(/ L /g) ?? []).length).toBe(3);
	});

	it('1×1 tile at origin has correct corners', () => {
		// All four corner centers collapse to isoToScreen(0,0,0) = {0,0}
		// top={0,-50}, right={100,0}, bottom={0,50}, left={-100,0}
		expect(floorTilePath(0, 0, 0, 1, 1, cfg)).toBe('M 0,-50 L 100,0 L 0,50 L -100,0 Z');
	});

	it('2×1 tile right corner extends along x', () => {
		// rightCenter = isoToScreen(1,0,0) = {100,50} → right vertex = {200,50}
		expect(floorTilePath(0, 0, 0, 2, 1, cfg)).toContain('L 200,50');
	});

	it('1×2 tile bottom corner extends along y', () => {
		// bottomCenter = isoToScreen(0,1,0) = {-100,50} → bottom vertex = {-100,100}
		expect(floorTilePath(0, 0, 0, 1, 2, cfg)).toContain('L -100,100');
	});

	it('elevated gz shifts all corners upward on screen', () => {
		const ground = floorTilePath(0, 0, 0, 2, 2, cfg);
		const elevated = floorTilePath(0, 0, 1, 2, 2, cfg);
		const maxY = (path: string) =>
			Math.max(...pathNumbers(path).filter((_, i) => i % 2 === 1));
		expect(maxY(elevated)).toBeLessThan(maxY(ground));
	});
});

describe('boundingBox', () => {
	it('returns a zero-sized box for empty input', () => {
		expect(boundingBox([], cfg)).toEqual({
			minX: 0,
			minY: 0,
			maxX: 0,
			maxY: 0,
			width: 0,
			height: 0
		});
	});

	it('width equals maxX − minX', () => {
		const result = boundingBox([{ x: 0, y: 0 }, { x: 2, y: 0 }], cfg);
		expect(result.width).toBe(result.maxX - result.minX);
	});

	it('height equals maxY − minY', () => {
		const result = boundingBox([{ x: 0, y: 0 }, { x: 0, y: 2 }], cfg);
		expect(result.height).toBe(result.maxY - result.minY);
	});

	it('single point produces a non-zero box (padded by tileSize)', () => {
		const result = boundingBox([{ x: 0, y: 0 }], cfg);
		expect(result.width).toBeGreaterThan(0);
		expect(result.height).toBeGreaterThan(0);
	});

	it('z defaults to 0 when omitted', () => {
		const withZ = boundingBox([{ x: 1, y: 1, z: 0 }], cfg);
		const withoutZ = boundingBox([{ x: 1, y: 1 }], cfg);
		expect(withoutZ).toEqual(withZ);
	});

	it('higher z raises minY (top edge of bounding box)', () => {
		const ground = boundingBox([{ x: 0, y: 0, z: 0 }], cfg);
		const elevated = boundingBox([{ x: 0, y: 0, z: 2 }], cfg);
		expect(elevated.minY).toBeLessThan(ground.minY);
	});

	it('multiple spread-out points produce a wide bounding box', () => {
		const result = boundingBox(
			[{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 4 }],
			cfg
		);
		// (4,0) → screenX=400; (0,4) → screenX=−400 → width > 400
		expect(result.width).toBeGreaterThan(400);
	});
});
