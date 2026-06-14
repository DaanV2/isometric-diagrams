import yaml from 'js-yaml';
import type {
	DiagramSpec,
	DiagramNode,
	DiagramEdge,
	DiagramGroup,
	DiagramFlatArrow,
	DiagramFloorTile
} from '../types/diagram.js';

export class ParseError extends Error {
	constructor(
		message: string,
		public readonly cause?: unknown,
		/** 1-based line in the source where the error occurred, when known. */
		public readonly line?: number
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

	const flatArrows: DiagramFlatArrow[] = Array.isArray(obj['flatArrows'])
		? (obj['flatArrows'] as unknown[]).map((a, i) => {
				if (typeof a !== 'object' || a === null) {
					throw new ParseError(`flatArrows[${i}] must be an object.`);
				}
				const arr = a as Record<string, unknown>;
				if (typeof arr['from'] !== 'object' || arr['from'] === null) {
					throw new ParseError(`flatArrows[${i}] must have a "from" position object.`);
				}
				if (typeof arr['to'] !== 'object' || arr['to'] === null) {
					throw new ParseError(`flatArrows[${i}] must have a "to" position object.`);
				}
				const from = arr['from'] as Record<string, unknown>;
				const to = arr['to'] as Record<string, unknown>;
				if (typeof from['x'] !== 'number' || typeof from['y'] !== 'number') {
					throw new ParseError(`flatArrows[${i}] "from" must have numeric "x" and "y".`);
				}
				if (typeof to['x'] !== 'number' || typeof to['y'] !== 'number') {
					throw new ParseError(`flatArrows[${i}] "to" must have numeric "x" and "y".`);
				}
				return arr as unknown as DiagramFlatArrow;
			})
		: [];

	const floorTiles: DiagramFloorTile[] = Array.isArray(obj['floorTiles'])
		? (obj['floorTiles'] as unknown[]).map((t, i) => {
				if (typeof t !== 'object' || t === null) {
					throw new ParseError(`floorTiles[${i}] must be an object.`);
				}
				const tile = t as Record<string, unknown>;
				if (typeof tile['position'] !== 'object' || tile['position'] === null) {
					throw new ParseError(`floorTiles[${i}] must have a "position" object.`);
				}
				const pos = tile['position'] as Record<string, unknown>;
				if (typeof pos['x'] !== 'number' || typeof pos['y'] !== 'number') {
					throw new ParseError(`floorTiles[${i}] "position" must have numeric "x" and "y".`);
				}
				return tile as unknown as DiagramFloorTile;
			})
		: [];

	return {
		...(obj as Omit<DiagramSpec, 'nodes' | 'edges' | 'groups' | 'flatArrows' | 'floorTiles'>),
		nodes,
		edges,
		groups,
		flatArrows,
		floorTiles
	} as DiagramSpec;
}

/** Parse a YAML string into a validated DiagramSpec. */
export function parseYaml(source: string): DiagramSpec {
	let raw: unknown;
	try {
		raw = yaml.load(source);
	} catch (err) {
		const mark = (err as { mark?: { line?: number } }).mark;
		const line = typeof mark?.line === 'number' ? mark.line + 1 : undefined;
		throw new ParseError(`YAML parse error: ${(err as Error).message}`, err, line);
	}

	return validate(raw);
}

/** Convert a DiagramSpec back to a YAML string (for the editor round-trip). */
export function dumpYaml(spec: DiagramSpec): string {
	return yaml.dump(spec, { lineWidth: 120 });
}
