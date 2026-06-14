/**
 * Higher-level isometric drawing primitives.
 *
 * This module sits between the raw projection math in isometric.ts and the
 * Svelte rendering components. Each function accepts typed diagram objects
 * plus a tileSize and returns SVG-ready geometry — path strings, polygon
 * point strings, and screen-space label positions.
 *
 * Components should import from here rather than calling isoToScreen /
 * boxPaths / etc. directly, so coordinate math stays out of component code.
 */

import type { DiagramNode, DiagramEdge, DiagramFlatArrow, DiagramFloorTile } from '../types/diagram.js';
import {
	isoToScreen,
	boxPaths,
	edgePath,
	arrowHead,
	flatArrowPath,
	flatArrowHead,
	floorTilePath,
	type ScreenPoint
} from './isometric.js';

/** Every node renders as a box exactly this many grid units tall. */
export const NODE_HEIGHT = 1;

// ─── Node ────────────────────────────────────────────────────────────────────

export interface NodeBox {
	/** SVG path for the top (diamond) face. */
	top: string;
	/** SVG path for the left face. */
	left: string;
	/** SVG path for the right face. */
	right: string;
	/** Screen-space anchor for the label below the box. */
	labelPos: ScreenPoint;
	/** Screen-space anchor for the icon centred in the box. */
	iconPos: ScreenPoint;
}

/** Compute the three face paths and text anchors for a node's isometric box. */
export function nodeBox(node: DiagramNode, tileSize: number): NodeBox {
	const gz = node.position.z ?? 0;
	const { top, left, right } = boxPaths(
		node.position.x,
		node.position.y,
		gz,
		NODE_HEIGHT,
		{ tileSize }
	);
	const labelPos = isoToScreen(
		node.position.x,
		node.position.y,
		gz + NODE_HEIGHT + 0.3,
		{ tileSize }
	);
	const iconPos = isoToScreen(
		node.position.x,
		node.position.y,
		gz + NODE_HEIGHT * 0.52,
		{ tileSize }
	);
	return { top, left, right, labelPos, iconPos };
}

// ─── Edge depth sorting ──────────────────────────────────────────────────────

/**
 * Sort edges back-to-front using the same x+y painter's-algorithm heuristic
 * as nodes. Depth is approximated as the average of the two endpoint depths.
 * Edges with unknown endpoints (dangling references) sort to the back.
 */
export function sortEdgesByDepth(edges: DiagramEdge[], nodes: DiagramNode[]): DiagramEdge[] {
	return [...edges].sort((a, b) => {
		const fromA = nodes.find((n) => n.id === a.from);
		const toA = nodes.find((n) => n.id === a.to);
		const fromB = nodes.find((n) => n.id === b.from);
		const toB = nodes.find((n) => n.id === b.to);
		const depthA =
			((fromA?.position.x ?? 0) +
				(fromA?.position.y ?? 0) +
				(toA?.position.x ?? 0) +
				(toA?.position.y ?? 0)) /
			2;
		const depthB =
			((fromB?.position.x ?? 0) +
				(fromB?.position.y ?? 0) +
				(toB?.position.x ?? 0) +
				(toB?.position.y ?? 0)) /
			2;
		return depthA - depthB;
	});
}

// ─── Edge ────────────────────────────────────────────────────────────────────

export interface EdgeGeometry {
	/** SVG path for the L-shaped connector line. */
	path: string;
	/** SVG `points` string for the arrowhead polygon; empty string when undirected. */
	arrowPoints: string;
	/** Screen-space midpoint for an optional edge label; null when not needed. */
	midPoint: ScreenPoint | null;
}

/** Compute the connector path, arrowhead, and label midpoint for an edge. */
export function edgeGeometry(
	from: DiagramNode,
	to: DiagramNode,
	directed: boolean,
	hasLabel: boolean,
	tileSize: number
): EdgeGeometry {
	const fz = from.position.z ?? 0;
	const tz = to.position.z ?? 0;

	const path = edgePath(
		from.position.x,
		from.position.y,
		fz,
		to.position.x,
		to.position.y,
		tz,
		{ tileSize }
	);

	const arrowPoints = directed
		? arrowHead(to.position.x, to.position.y, tz, from.position.x, from.position.y, { tileSize })
		: '';

	const midPoint = hasLabel
		? isoToScreen(
				(from.position.x + to.position.x) / 2,
				(from.position.y + to.position.y) / 2,
				(fz + tz) / 2 + 0.5,
				{ tileSize }
			)
		: null;

	return { path, arrowPoints, midPoint };
}

// ─── Flat arrow ──────────────────────────────────────────────────────────────

export interface FlatArrowGeometry {
	/** SVG path for the ground-plane connector line. */
	path: string;
	/** SVG `points` string for the arrowhead polygon; empty string when undirected. */
	arrowPoints: string;
	/** Screen-space midpoint for an optional label; null when not needed. */
	midPoint: ScreenPoint | null;
}

/** Compute the connector path, arrowhead, and label midpoint for a flat arrow. */
export function flatArrowGeometry(arrow: DiagramFlatArrow, tileSize: number): FlatArrowGeometry {
	const z = arrow.from.z ?? 0;
	const directed = arrow.directed !== false;

	const path = flatArrowPath(arrow.from.x, arrow.from.y, arrow.to.x, arrow.to.y, z, { tileSize });

	const arrowPoints = directed
		? flatArrowHead(arrow.from.x, arrow.from.y, arrow.to.x, arrow.to.y, z, { tileSize })
		: '';

	const midPoint = arrow.label
		? isoToScreen(
				(arrow.from.x + arrow.to.x) / 2,
				(arrow.from.y + arrow.to.y) / 2,
				z,
				{ tileSize }
			)
		: null;

	return { path, arrowPoints, midPoint };
}

// ─── Floor tile ──────────────────────────────────────────────────────────────

export interface FloorTileGeometry {
	/** SVG path for the diamond-shaped tile outline. */
	path: string;
	/** Screen-space centre for the tile label; null when the tile has no label. */
	labelPos: ScreenPoint | null;
}

/** Compute the outline path and label position for a floor tile area. */
export function floorTileGeometry(tile: DiagramFloorTile, tileSize: number): FloorTileGeometry {
	const gz = tile.position.z ?? 0;
	const w = tile.width ?? 1;
	const d = tile.depth ?? 1;

	const path = floorTilePath(tile.position.x, tile.position.y, gz, w, d, { tileSize });

	const labelPos = tile.label
		? isoToScreen(
				tile.position.x + (w - 1) / 2,
				tile.position.y + (d - 1) / 2,
				gz,
				{ tileSize }
			)
		: null;

	return { path, labelPos };
}

// ─── Group boundary ──────────────────────────────────────────────────────────

export interface GroupBoundary {
	/** SVG `points` string for the isometric parallelogram polygon. */
	points: string;
	/** Screen-space X for the group label (centred on the top vertex). */
	labelX: number;
	/** Screen-space Y for the group label (just inside the top vertex). */
	labelY: number;
}

/**
 * Compute the isometric parallelogram that surrounds a group of nodes.
 *
 * The shape follows the two isometric grid axes so its edges lie on grid
 * lines. Top, right, and left corners are projected at cube-top height so
 * the boundary clears all node boxes. The bottom corner is at ground level
 * with a small downward extension to cover cube side faces.
 *
 * @param memberNodes - All nodes belonging to the group.
 * @param tileSize    - Diagram tile size in pixels.
 * @param gpad        - Padding in grid units around the bounding box (default 1).
 */
export function groupBoundary(
	memberNodes: DiagramNode[],
	tileSize: number,
	gpad = 1
): GroupBoundary | null {
	if (memberNodes.length === 0) return null;

	const gxs = memberNodes.map((n) => n.position.x);
	const gys = memberNodes.map((n) => n.position.y);
	const maxZ = Math.max(...memberNodes.map((n) => n.position.z ?? 0));
	const zTop = maxZ + NODE_HEIGHT;

	const minGX = Math.min(...gxs) - gpad;
	const maxGX = Math.max(...gxs) + gpad;
	const minGY = Math.min(...gys) - gpad;
	const maxGY = Math.max(...gys) + gpad;

	const cfg = { tileSize };
	const top = isoToScreen(minGX, minGY, zTop, cfg);
	const right = isoToScreen(maxGX, minGY, zTop, cfg);
	const bottom = isoToScreen(maxGX, maxGY, 0, cfg);
	const left = isoToScreen(minGX, maxGY, zTop, cfg);

	const points = [
		`${top.x},${top.y}`,
		`${right.x},${right.y}`,
		`${bottom.x},${bottom.y + tileSize * 0.5}`,
		`${left.x},${left.y}`
	].join(' ');

	return { points, labelX: top.x, labelY: top.y + 14 };
}

// ─── Grid lines ──────────────────────────────────────────────────────────────

/**
 * Compute SVG path strings for the isometric grid background.
 *
 * Generates one line per column and one per row of the grid, extending one
 * tile beyond the outermost node positions on each side.
 *
 * @returns Array of `M x,y L x,y` path strings, one per grid line.
 */
export function isoGridLines(nodes: DiagramNode[], tileSize: number): string[] {
	if (nodes.length === 0) return [];

	const xs = nodes.map((n) => n.position.x);
	const ys = nodes.map((n) => n.position.y);
	const minGX = Math.min(...xs) - 1;
	const maxGX = Math.max(...xs) + 1;
	const minGY = Math.min(...ys) - 1;
	const maxGY = Math.max(...ys) + 1;

	const cfg = { tileSize };
	const lines: string[] = [];

	for (let gx = minGX; gx <= maxGX; gx++) {
		const a = isoToScreen(gx, minGY, 0, cfg);
		const b = isoToScreen(gx, maxGY, 0, cfg);
		lines.push(`M ${a.x},${a.y} L ${b.x},${b.y}`);
	}
	for (let gy = minGY; gy <= maxGY; gy++) {
		const a = isoToScreen(minGX, gy, 0, cfg);
		const b = isoToScreen(maxGX, gy, 0, cfg);
		lines.push(`M ${a.x},${a.y} L ${b.x},${b.y}`);
	}

	return lines;
}
