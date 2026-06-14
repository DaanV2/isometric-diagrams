import { describe, it, expect } from 'vitest';
import { autoLayout } from '../layout.js';
import type { DiagramSpec } from '../types/diagram.js';

const node = (id: string, z?: number) => ({
	id,
	label: id,
	position: { x: 999, y: 999, ...(z !== undefined ? { z } : {}) }
});

function spec(partial: Partial<DiagramSpec>): DiagramSpec {
	return { title: 'T', nodes: [], ...partial } as DiagramSpec;
}

describe('autoLayout', () => {
	it('ranks a linear chain into successive rows', () => {
		const s = spec({
			nodes: [node('a'), node('b'), node('c')],
			edges: [
				{ from: 'a', to: 'b' },
				{ from: 'b', to: 'c' }
			]
		});
		const out = autoLayout(s, { spacing: 2 });
		const y = (id: string) => out.nodes.find((n) => n.id === id)!.position.y;
		expect(y('a')).toBe(0);
		expect(y('b')).toBe(2);
		expect(y('c')).toBe(4);
	});

	it('uses the longest path when ranks could differ', () => {
		// a->b->c and a->c : c must sit below b (rank 2), not rank 1.
		const s = spec({
			nodes: [node('a'), node('b'), node('c')],
			edges: [
				{ from: 'a', to: 'b' },
				{ from: 'b', to: 'c' },
				{ from: 'a', to: 'c' }
			]
		});
		const out = autoLayout(s, { spacing: 2 });
		const y = (id: string) => out.nodes.find((n) => n.id === id)!.position.y;
		expect(y('c')).toBe(4);
	});

	it('centres siblings within a rank', () => {
		const s = spec({
			nodes: [node('root'), node('x'), node('y'), node('z')],
			edges: [
				{ from: 'root', to: 'x' },
				{ from: 'root', to: 'y' },
				{ from: 'root', to: 'z' }
			]
		});
		const out = autoLayout(s, { spacing: 2 });
		const x = (id: string) => out.nodes.find((n) => n.id === id)!.position.x;
		// three children centred around 0 → -2, 0, 2
		expect([x('x'), x('y'), x('z')]).toEqual([-2, 0, 2]);
	});

	it('places disconnected nodes in the first rank', () => {
		const s = spec({ nodes: [node('a'), node('b')] });
		const out = autoLayout(s);
		expect(out.nodes.every((n) => n.position.y === 0)).toBe(true);
	});

	it('does not crash on cycles', () => {
		const s = spec({
			nodes: [node('a'), node('b')],
			edges: [
				{ from: 'a', to: 'b' },
				{ from: 'b', to: 'a' }
			]
		});
		expect(() => autoLayout(s)).not.toThrow();
		expect(autoLayout(s).nodes).toHaveLength(2);
	});

	it('preserves node identity, count, and z elevation', () => {
		const s = spec({ nodes: [node('a', 3), node('b')], edges: [{ from: 'a', to: 'b' }] });
		const out = autoLayout(s);
		expect(out.nodes.map((n) => n.id)).toEqual(['a', 'b']);
		expect(out.nodes.find((n) => n.id === 'a')!.position.z).toBe(3);
	});
});
