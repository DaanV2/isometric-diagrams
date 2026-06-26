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
	ribbonPath,
	polylinePath,
	ribbonArrowHead,
	insetRouteEnds,
	floorTilePath,
	type GridPoint,
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
	/** SVG path for the soft contact shadow on the ground under the box. */
	shadow: string;
	/** Screen-space anchor for the label below the box. */
	labelPos: ScreenPoint;
	/** Screen-space anchor for the icon, centred on the top face. */
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
		gz + NODE_HEIGHT + 0.95,
		{ tileSize }
	);
	// Icon sits centred on the top (diamond) face.
	const iconPos = isoToScreen(
		node.position.x,
		node.position.y,
		gz + NODE_HEIGHT,
		{ tileSize }
	);
	// Contact shadow: an enlarged ground diamond, nudged toward the shadowed
	// side, so a soft pool of darkness peeks out from under the cube's base.
	const base = isoToScreen(node.position.x, node.position.y, gz, { tileSize });
	const sw = tileSize * 1.18; // shadow half-width
	const sh = (tileSize / 2) * 1.18;
	const ox = -tileSize * 0.08;
	const oy = tileSize * 0.1;
	const cx = base.x + ox;
	const cy = base.y + oy;
	const shadow = `M ${cx},${cy - sh} L ${cx + sw},${cy} L ${cx},${cy + sh} L ${cx - sw},${cy} Z`;

	return { top, left, right, shadow, labelPos, iconPos };
}

// ─── Edge depth sorting ──────────────────────────────────────────────────────

/**
 * Sort edges back-to-front using the same x+y painter's-algorithm heuristic
 * as nodes. Depth is approximated as the average of the two endpoint depths.
 * Edges with unknown endpoints (dangling references) sort to the back.
 */
export function sortEdgesByDepth(edges: DiagramEdge[], nodeMap: Map<string, DiagramNode>): DiagramEdge[] {
	return [...edges].sort((a, b) => {
		const fromA = nodeMap.get(a.from), toA = nodeMap.get(a.to);
		const fromB = nodeMap.get(b.from), toB = nodeMap.get(b.to);
		const depthA = ((fromA?.position.x ?? 0) + (fromA?.position.y ?? 0) + (toA?.position.x ?? 0) + (toA?.position.y ?? 0)) / 2;
		const depthB = ((fromB?.position.x ?? 0) + (fromB?.position.y ?? 0) + (toB?.position.x ?? 0) + (toB?.position.y ?? 0)) / 2;
		return depthA - depthB;
	});
}

// ─── Edge ────────────────────────────────────────────────────────────────────

/** How far (grid units) a ribbon end is pulled out of the cube it connects. */
const EDGE_START_INSET = 0.45;
const EDGE_END_INSET = 0.62;
/** Arrowhead size for connector ribbons, in grid units. */
const ARROW_LENGTH = 0.52;
const ARROW_HALF_WIDTH = 0.27;

export interface EdgeGeometry {
	/** Closed SVG path for the filled ribbon band lying on the ground. */
	path: string;
	/** SVG path for the thin gloss spine running down the ribbon's centre. */
	spine: string;
	/** SVG `points` string for the arrowhead polygon; empty string when undirected. */
	arrowPoints: string;
	/** Screen-space midpoint for an optional edge label; null when not needed. */
	midPoint: ScreenPoint | null;
}

/** Compute the ribbon band, spine, arrowhead, and label midpoint for an edge. */
export function edgeGeometry(
	from: DiagramNode,
	to: DiagramNode,
	directed: boolean,
	hasLabel: boolean,
	tileSize: number
): EdgeGeometry {
	const fz = from.position.z ?? 0;
	const tz = to.position.z ?? 0;
	// The ribbon lies flat on the ground plane between the two cube bases.
	const z = (fz + tz) / 2;
	const cfg = { tileSize };

	// L-shaped route in grid space: along X first, then along Y into the target.
	const route: GridPoint[] = [
		{ x: from.position.x, y: from.position.y },
		{ x: to.position.x, y: from.position.y },
		{ x: to.position.x, y: to.position.y }
	];
	const inset = insetRouteEnds(route, EDGE_START_INSET, EDGE_END_INSET);

	const path = ribbonPath(inset, z, cfg);
	const spine = polylinePath(inset, z, cfg);

	// Arrowhead points along the last leg, tip at the inset route end.
	const tip = inset[inset.length - 1];
	const prev = inset[inset.length - 2];
	const arrowPoints = directed
		? ribbonArrowHead(prev, tip, z, cfg, ARROW_LENGTH, ARROW_HALF_WIDTH)
		: '';

	const midPoint = hasLabel
		? isoToScreen(
				(from.position.x + to.position.x) / 2,
				(from.position.y + to.position.y) / 2,
				z,
				cfg
			)
		: null;

	return { path, spine, arrowPoints, midPoint };
}

// ─── Flat arrow ──────────────────────────────────────────────────────────────

export interface FlatArrowGeometry {
	/** Closed SVG path for the filled ribbon band lying on the ground. */
	path: string;
	/** SVG path for the thin gloss spine running down the ribbon's centre. */
	spine: string;
	/** SVG `points` string for the arrowhead polygon; empty string when undirected. */
	arrowPoints: string;
	/** Screen-space midpoint for an optional label; null when not needed. */
	midPoint: ScreenPoint | null;
}

/** Compute the ribbon band, spine, arrowhead, and label midpoint for a flat arrow. */
export function flatArrowGeometry(arrow: DiagramFlatArrow, tileSize: number): FlatArrowGeometry {
	const z = arrow.from.z ?? 0;
	const directed = arrow.directed !== false;
	const cfg = { tileSize };

	const from: GridPoint = { x: arrow.from.x, y: arrow.from.y };
	const to: GridPoint = { x: arrow.to.x, y: arrow.to.y };

	const path = ribbonPath([from, to], z, cfg);
	const spine = polylinePath([from, to], z, cfg);

	const arrowPoints = directed
		? ribbonArrowHead(from, to, z, cfg, ARROW_LENGTH, ARROW_HALF_WIDTH)
		: '';

	const midPoint = arrow.label
		? isoToScreen((arrow.from.x + arrow.to.x) / 2, (arrow.from.y + arrow.to.y) / 2, z, cfg)
		: null;

	return { path, spine, arrowPoints, midPoint };
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
 * The shape is a flat zone on the ground plane: all four corners sit at z = 0
 * so opposite edges are parallel and lie on the isometric grid lines — a clean
 * iso "rug" the member cubes stand on, rather than a skewed quad. Each corner
 * is pushed out by half a tile so the zone fully encloses the corner tiles'
 * footprints.
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

	const minGX = Math.min(...gxs) - gpad;
	const maxGX = Math.max(...gxs) + gpad;
	const minGY = Math.min(...gys) - gpad;
	const maxGY = Math.max(...gys) + gpad;

	const cfg = { tileSize };
	const hw = tileSize; // half tile width
	const hh = tileSize / 2; // half tile height

	const topC = isoToScreen(minGX, minGY, 0, cfg);
	const rightC = isoToScreen(maxGX, minGY, 0, cfg);
	const bottomC = isoToScreen(maxGX, maxGY, 0, cfg);
	const leftC = isoToScreen(minGX, maxGY, 0, cfg);

	// Push each corner out by half a tile along the diamond's axes.
	const top = { x: topC.x, y: topC.y - hh };
	const right = { x: rightC.x + hw, y: rightC.y };
	const bottom = { x: bottomC.x, y: bottomC.y + hh };
	const left = { x: leftC.x - hw, y: leftC.y };

	const points = [top, right, bottom, left].map((p) => `${p.x},${p.y}`).join(' ');

	return { points, labelX: top.x, labelY: top.y - 6 };
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
