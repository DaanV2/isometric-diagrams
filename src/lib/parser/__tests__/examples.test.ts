import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseYaml } from '../yaml-parser.js';
import { lintSpec } from '../lint.js';

const EXAMPLES = ['networking.yaml', 'warehouse.yaml', 'simple-flow.yaml', 'floor-plan.yaml'];

describe('bundled examples', () => {
	for (const file of EXAMPLES) {
		it(`${file} parses and lints clean`, () => {
			const source = readFileSync(`static/examples/${file}`, 'utf8');
			const spec = parseYaml(source);
			const problems = lintSpec(spec);
			// Curated examples should have no diagnostics at all.
			expect(problems, JSON.stringify(problems, null, 2)).toEqual([]);
		});
	}
});
