import { describe, it, expect } from 'vitest';
import { isoToScreen } from '../isometric.js';
import { cfg } from './helpers.js';

describe('isoToScreen', () => {
	it('maps origin to screen origin', () => {
		expect(isoToScreen(0, 0, 0, cfg)).toEqual({ x: 0, y: 0 });
	});

	it('positive gx moves right and down', () => {
		// screenX = (1-0)*100 = 100, screenY = (1+0)*50 - 0 = 50
		expect(isoToScreen(1, 0, 0, cfg)).toEqual({ x: 100, y: 50 });
	});

	it('positive gy moves left and down', () => {
		// screenX = (0-1)*100 = -100, screenY = (0+1)*50 = 50
		expect(isoToScreen(0, 1, 0, cfg)).toEqual({ x: -100, y: 50 });
	});

	it('positive gz moves straight up', () => {
		// screenX = 0, screenY = 0 - 1*100 = -100
		expect(isoToScreen(0, 0, 1, cfg)).toEqual({ x: 0, y: -100 });
	});

	it('mixed coordinates combine contributions', () => {
		// gx=2, gy=1, gz=0: x=(2-1)*100=100, y=(2+1)*50=150
		expect(isoToScreen(2, 1, 0, cfg)).toEqual({ x: 100, y: 150 });
	});

	it('gz lifts the point above xy projection', () => {
		// gx=1, gy=1, gz=2: x=(1-1)*100=0, y=(1+1)*50-2*100=100-200=-100
		expect(isoToScreen(1, 1, 2, cfg)).toEqual({ x: 0, y: -100 });
	});

	it('scales linearly with tileSize', () => {
		const small = isoToScreen(1, 0, 0, { tileSize: 50 });
		const large = isoToScreen(1, 0, 0, { tileSize: 200 });
		expect(large.x).toBe(small.x * 4);
		expect(large.y).toBe(small.y * 4);
	});

	it('negative coordinates work correctly', () => {
		// gx=-1, gy=0: x=(-1-0)*100=-100, y=(-1+0)*50=-50
		expect(isoToScreen(-1, 0, 0, cfg)).toEqual({ x: -100, y: -50 });
	});
});
