import yaml from 'js-yaml';
import type { DiagramSpec, DiagramNode, DiagramEdge, DiagramGroup } from '../types/diagram.js';

export class ParseError extends Error {
	constructor(
		message: string,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'ParseError';
	}
}

/** Validate and normalise a raw YAML-parsed object into a DiagramSpec. */
function validate(raw: unknown): DiagramSpec {
	if (typeof raw !== 'object' || raw === null) {
		throw new ParseError('Diagram spec must be a YAML object (mapping).');
	}

	const obj = raw as Record<string, unknown>;

	if (typeof obj['title'] !== 'string' || obj['title'].trim() === '') {
		throw new ParseError('Diagram spec must include a non-empty "title" field.');
	}

	if (!Array.isArray(obj['nodes'])) {
		throw new ParseError('Diagram spec must include a "nodes" array.');
	}

	const nodes: DiagramNode[] = (obj['nodes'] as unknown[]).map((n, i) => {
		if (typeof n !== 'object' || n === null) {
			throw new ParseError(`nodes[${i}] must be an object.`);
		}
		const node = n as Record<string, unknown>;

		if (typeof node['id'] !== 'string' || node['id'].trim() === '') {
			throw new ParseError(`nodes[${i}] must have a non-empty "id" string.`);
		}
		if (typeof node['label'] !== 'string' || node['label'].trim() === '') {
			throw new ParseError(`nodes[${i}] (id: "${node['id']}") must have a non-empty "label" string.`);
		}

		const pos = node['position'];
		if (typeof pos !== 'object' || pos === null) {
			throw new ParseError(`nodes[${i}] (id: "${node['id']}") must have a "position" object.`);
		}
		const posObj = pos as Record<string, unknown>;
		if (typeof posObj['x'] !== 'number' || typeof posObj['y'] !== 'number') {
			throw new ParseError(
				`nodes[${i}] (id: "${node['id']}") position must have numeric "x" and "y".`
			);
		}

		return node as unknown as DiagramNode;
	});

	const edges: DiagramEdge[] = Array.isArray(obj['edges'])
		? (obj['edges'] as unknown[]).map((e, i) => {
				if (typeof e !== 'object' || e === null) {
					throw new ParseError(`edges[${i}] must be an object.`);
				}
				const edge = e as Record<string, unknown>;
				if (typeof edge['from'] !== 'string' || typeof edge['to'] !== 'string') {
					throw new ParseError(`edges[${i}] must have string "from" and "to" fields.`);
				}
				return edge as unknown as DiagramEdge;
			})
		: [];

	const groups: DiagramGroup[] = Array.isArray(obj['groups'])
		? (obj['groups'] as unknown[]).map((g, i) => {
				if (typeof g !== 'object' || g === null) {
					throw new ParseError(`groups[${i}] must be an object.`);
				}
				const grp = g as Record<string, unknown>;
				if (typeof grp['id'] !== 'string' || typeof grp['label'] !== 'string') {
					throw new ParseError(`groups[${i}] must have string "id" and "label".`);
				}
				if (!Array.isArray(grp['nodes'])) {
					throw new ParseError(`groups[${i}] must have a "nodes" array.`);
				}
				return grp as unknown as DiagramGroup;
			})
		: [];

	return {
		...(obj as Omit<DiagramSpec, 'nodes' | 'edges' | 'groups'>),
		nodes,
		edges,
		groups
	} as DiagramSpec;
}

/** Parse a YAML string into a validated DiagramSpec. */
export function parseYaml(source: string): DiagramSpec {
	let raw: unknown;
	try {
		raw = yaml.load(source);
	} catch (err) {
		throw new ParseError(`YAML parse error: ${(err as Error).message}`, err);
	}

	return validate(raw);
}

/** Convert a DiagramSpec back to a YAML string (for the editor round-trip). */
export function dumpYaml(spec: DiagramSpec): string {
	return yaml.dump(spec, { lineWidth: 120 });
}
