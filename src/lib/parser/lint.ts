/**
 * Non-fatal diagnostics for a parsed DiagramSpec.
 *
 * `parseYaml` only guarantees the spec is structurally well-formed. This linter
 * catches the *semantic* mistakes that otherwise fail silently while authoring:
 * edges/groups pointing at ids that don't exist, duplicate ids, unknown enum
 * values, and so on. None of these stop the diagram rendering — they surface in
 * the editor's "Problems" panel so typos are visible.
 */

import type { DiagramSpec } from '../types/diagram.js';
import { NODE_TYPE_NAMES, EDGE_TYPE_NAMES } from '../renderer/theme.js';

export type Severity = 'error' | 'warning';

export interface Diagnostic {
	severity: Severity;
	message: string;
	/** A token (id/type) the editor can locate in the source to jump to. */
	ref?: string;
}

const NODE_TYPES = new Set<string>(NODE_TYPE_NAMES);
const EDGE_TYPES = new Set<string>(EDGE_TYPE_NAMES);

/** Collect all non-fatal problems in a parsed spec. */
export function lintSpec(spec: DiagramSpec): Diagnostic[] {
	const diags: Diagnostic[] = [];

	// ── Nodes: duplicate ids & unknown types ──
	const idCounts = new Map<string, number>();
	for (const n of spec.nodes) idCounts.set(n.id, (idCounts.get(n.id) ?? 0) + 1);
	for (const [id, count] of idCounts) {
		if (count > 1) {
			diags.push({
				severity: 'error',
				message: `Duplicate node id "${id}" — ${count} nodes share it; edges to it are ambiguous.`,
				ref: id
			});
		}
	}
	for (const n of spec.nodes) {
		if (n.type && !NODE_TYPES.has(n.type)) {
			diags.push({
				severity: 'warning',
				message: `Node "${n.id}" has unknown type "${n.type}" — it will render as "generic".`,
				ref: n.id
			});
		}
	}

	const nodeIds = new Set(spec.nodes.map((n) => n.id));

	// ── Edges: dangling endpoints, self-loops, unknown types ──
	for (const e of spec.edges ?? []) {
		if (!nodeIds.has(e.from)) {
			diags.push({
				severity: 'error',
				message: `Edge references unknown source node "${e.from}".`,
				ref: e.from
			});
		}
		if (!nodeIds.has(e.to)) {
			diags.push({
				severity: 'error',
				message: `Edge references unknown target node "${e.to}".`,
				ref: e.to
			});
		}
		if (e.from === e.to) {
			diags.push({
				severity: 'warning',
				message: `Edge on "${e.from}" points to itself.`,
				ref: e.from
			});
		}
		if (e.type && !EDGE_TYPES.has(e.type)) {
			diags.push({
				severity: 'warning',
				message: `Edge ${e.from} → ${e.to} has unknown type "${e.type}".`,
				ref: e.type
			});
		}
	}

	// ── Groups: dangling members, empties, duplicate ids ──
	const groupCounts = new Map<string, number>();
	for (const g of spec.groups ?? []) {
		groupCounts.set(g.id, (groupCounts.get(g.id) ?? 0) + 1);
		for (const member of g.nodes) {
			if (!nodeIds.has(member)) {
				diags.push({
					severity: 'error',
					message: `Group "${g.id}" references unknown node "${member}".`,
					ref: member
				});
			}
		}
		if (g.nodes.length === 0) {
			diags.push({ severity: 'warning', message: `Group "${g.id}" has no members.`, ref: g.id });
		}
	}
	for (const [id, count] of groupCounts) {
		if (count > 1) {
			diags.push({ severity: 'error', message: `Duplicate group id "${id}".`, ref: id });
		}
	}

	if (spec.nodes.length === 0) {
		diags.push({ severity: 'warning', message: 'Diagram has no nodes yet.' });
	}

	return diags;
}

/**
 * 1-based line number of the first occurrence of `token` in `source`, or
 * undefined if absent. Used to jump the editor near a diagnostic.
 */
export function findTokenLine(source: string, token: string | undefined): number | undefined {
	if (!token) return undefined;
	const idx = source.indexOf(token);
	if (idx < 0) return undefined;
	return source.slice(0, idx).split('\n').length;
}
