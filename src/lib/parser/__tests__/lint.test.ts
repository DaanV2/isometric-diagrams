import { describe, it, expect } from 'vitest';
import { lintSpec, findTokenLine } from '../lint.js';
import type { DiagramSpec } from '../../types/diagram.js';

function spec(partial: Partial<DiagramSpec>): DiagramSpec {
	return {
		title: 'Test',
		nodes: [],
		...partial
	} as DiagramSpec;
}

const node = (id: string, type?: string) => ({
	id,
	label: id,
	position: { x: 0, y: 0 },
	...(type ? { type: type as never } : {})
});

describe('lintSpec', () => {
	it('reports no problems for a clean spec', () => {
		const s = spec({
			nodes: [node('a', 'server'), node('b', 'database')],
			edges: [{ from: 'a', to: 'b', type: 'network' }],
			groups: [{ id: 'g', label: 'G', nodes: ['a', 'b'] }]
		});
		expect(lintSpec(s)).toEqual([]);
	});

	it('flags an edge with an unknown source or target', () => {
		const s = spec({ nodes: [node('a')], edges: [{ from: 'a', to: 'ghost' }] });
		const diags = lintSpec(s);
		expect(diags).toHaveLength(1);
		expect(diags[0]).toMatchObject({ severity: 'error', ref: 'ghost' });
		expect(diags[0].message).toContain('unknown target node "ghost"');
	});

	it('flags duplicate node ids as an error', () => {
		const s = spec({ nodes: [node('a'), node('a')] });
		const diags = lintSpec(s);
		expect(diags).toEqual([
			expect.objectContaining({ severity: 'error', ref: 'a' })
		]);
		expect(diags[0].message).toContain('Duplicate node id "a"');
	});

	it('warns about unknown node types but keeps it non-fatal', () => {
		const s = spec({ nodes: [node('a', 'banana')] });
		const diags = lintSpec(s);
		expect(diags).toHaveLength(1);
		expect(diags[0]).toMatchObject({ severity: 'warning', ref: 'a' });
	});

	it('warns about self-loop edges', () => {
		const s = spec({ nodes: [node('a')], edges: [{ from: 'a', to: 'a' }] });
		const diags = lintSpec(s);
		expect(diags.some((d) => d.severity === 'warning' && d.message.includes('itself'))).toBe(true);
	});

	it('flags group members that do not exist', () => {
		const s = spec({
			nodes: [node('a')],
			groups: [{ id: 'g', label: 'G', nodes: ['a', 'missing'] }]
		});
		const diags = lintSpec(s);
		expect(diags).toEqual([
			expect.objectContaining({ severity: 'error', ref: 'missing' })
		]);
	});

	it('warns when the diagram has no nodes', () => {
		expect(lintSpec(spec({ nodes: [] }))).toEqual([
			expect.objectContaining({ severity: 'warning' })
		]);
	});

	it('collects multiple problems at once', () => {
		const s = spec({
			nodes: [node('a'), node('a')],
			edges: [{ from: 'a', to: 'x' }],
			groups: [{ id: 'g', label: 'G', nodes: ['y'] }]
		});
		const diags = lintSpec(s);
		// duplicate id + unknown edge target + unknown group member
		expect(diags.length).toBeGreaterThanOrEqual(3);
	});
});

describe('findTokenLine', () => {
	const src = 'title: T\nnodes:\n  - id: alpha\n  - id: beta\n';

	it('returns the 1-based line of the first occurrence', () => {
		expect(findTokenLine(src, 'alpha')).toBe(3);
		expect(findTokenLine(src, 'beta')).toBe(4);
	});

	it('returns undefined for missing tokens or empty refs', () => {
		expect(findTokenLine(src, 'gamma')).toBeUndefined();
		expect(findTokenLine(src, undefined)).toBeUndefined();
		expect(findTokenLine(src, '')).toBeUndefined();
	});
});
