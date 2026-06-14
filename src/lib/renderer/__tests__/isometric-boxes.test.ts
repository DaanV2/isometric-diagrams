import { describe, it, expect } from 'vitest';
import { tilePath, boxPaths } from '../isometric.js';
import { cfg, pathNumbers } from './helpers.js';

describe('tilePath', () => {
	it('produces a closed diamond path with 4 vertices', () => {
		const path = tilePath(0, 0, 0, cfg);
		expect(path).toMatch(/^M /);
		expect(path).toMatch(/Z$/);
		expect((path.match(/ L /g) ?? []).length).toBe(3);
	});

	it('center at (0,0,0) produces correct diamond corners', () => {
		// center = isoToScreen(0,0,0,{100}) = {x:0,y:0}
		// hw=100, hh=50 → M 0,-50 L 100,0 L 0,50 L -100,0 Z
		expect(tilePath(0, 0, 0, cfg)).toBe('M 0,-50 L 100,0 L 0,50 L -100,0 Z');
	});

	it('offset grid position shifts the diamond', () => {
		// center = isoToScreen(1,0,0,{100}) = {x:100,y:50}
		// M 100,0 L 200,50 L 100,100 L 0,50 Z
		expect(tilePath(1, 0, 0, cfg)).toBe('M 100,0 L 200,50 L 100,100 L 0,50 Z');
	});

	it('elevated gz shifts path upward', () => {
		// center = isoToScreen(0,0,1,{100}) = {x:0,y:-100}
		// M 0,-150 L 100,-100 L 0,-50 L -100,-100 Z
		expect(tilePath(0, 0, 1, cfg)).toBe('M 0,-150 L 100,-100 L 0,-50 L -100,-100 Z');
	});
});

describe('boxPaths', () => {
	it('returns top, left, and right face paths', () => {
		const result = boxPaths(0, 0, 0, 1, cfg);
		expect(result).toHaveProperty('top');
		expect(result).toHaveProperty('left');
		expect(result).toHaveProperty('right');
	});

	it('all three faces are closed SVG paths', () => {
		const { top, left, right } = boxPaths(0, 0, 0, 1, cfg);
		for (const path of [top, left, right]) {
			expect(path).toMatch(/^M /);
			expect(path).toMatch(/Z$/);
		}
	});

	it('top face is a diamond (4 vertices)', () => {
		const { top } = boxPaths(0, 0, 0, 1, cfg);
		expect((top.match(/ L /g) ?? []).length).toBe(3);
	});

	it('left and right faces are parallelograms (4 vertices)', () => {
		const { left, right } = boxPaths(0, 0, 0, 1, cfg);
		for (const face of [left, right]) {
			expect((face.match(/ L /g) ?? []).length).toBe(3);
		}
	});

	it('height h scales the face pixel height', () => {
		const h1 = boxPaths(0, 0, 0, 1, cfg, 0);
		const h2 = boxPaths(0, 0, 0, 2, cfg, 0);
		const yOf = (path: string) => pathNumbers(path).filter((_, i) => i % 2 === 1);
		const span = (ys: number[]) => Math.max(...ys) - Math.min(...ys);
		expect(span(yOf(h2.left))).toBeGreaterThan(span(yOf(h1.left)));
	});

	it('padding=0 produces full-size faces, padding>0 shrinks them', () => {
		const full = boxPaths(0, 0, 0, 1, cfg, 0);
		const inset = boxPaths(0, 0, 0, 1, cfg, 0.2);
		expect(Math.max(...pathNumbers(inset.top))).toBeLessThan(
			Math.max(...pathNumbers(full.top))
		);
	});

	it('top face center reflects gz+h elevation', () => {
		// gz=0, h=1 → top face at isoToScreen(0,0,1) = {x:0,y:-100}, hw=100, hh=50
		const { top } = boxPaths(0, 0, 0, 1, cfg, 0);
		expect(top).toBe('M 0,-150 L 100,-100 L 0,-50 L -100,-100 Z');
	});
});
