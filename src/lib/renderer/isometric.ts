/**
 * Isometric projection utilities.
 *
 * We use a standard 2:1 isometric projection where:
 *   - The grid x-axis goes right-and-down.
 *   - The grid y-axis goes left-and-down.
 *   - The z-axis goes straight up.
 *
 * Screen coordinates are computed as:
 *   screenX = (gridX - gridY) * (tileWidth / 2)
 *   screenY = (gridX + gridY) * (tileHeight / 2) - gridZ * tileHeight
 *
 * where tileWidth = tileSize * 2, tileHeight = tileSize.
 */

export interface ScreenPoint {
	x: number;
	y: number;
}

export interface IsoConfig {
	tileSize: number;
}

/** Convert isometric grid coordinates to 2-D screen coordinates. */
export function isoToScreen(
	gx: number,
	gy: number,
	gz: number,
	{ tileSize }: IsoConfig
): ScreenPoint {
	const tw = tileSize * 2;
	const th = tileSize;
	return {
		x: (gx - gy) * (tw / 2),
		y: (gx + gy) * (th / 2) - gz * th
	};
}

/**
 * Inverse of {@link isoToScreen}: convert a screen point back to grid
 * coordinates, given the z-layer the point sits on. Returns possibly-fractional
 * grid coordinates (round them to snap to the grid). Used for drag-to-place.
 */
export function screenToIso(
	sx: number,
	sy: number,
	gz: number,
	{ tileSize }: IsoConfig
): { gx: number; gy: number } {
	const a = sx / tileSize; // gx - gy
	const b = (sy + gz * tileSize) / (tileSize / 2); // gx + gy
	return { gx: (a + b) / 2, gy: (b - a) / 2 };
}

/**
 * Build the SVG path for a diamond-shaped floor tile at the given grid position.
 * The diamond has its centre at the screen coordinates of (gx, gy, gz).
 */
export function tilePath(gx: number, gy: number, gz: number, cfg: IsoConfig): string {
	const { x, y } = isoToScreen(gx, gy, gz, cfg);
	const hw = cfg.tileSize; // half-width
	const hh = cfg.tileSize / 2; // half-height
	return `M ${x},${y - hh} L ${x + hw},${y} L ${x},${y + hh} L ${x - hw},${y} Z`;
}

/**
 * Build SVG path data for the top face, left face and right face of an
 * isometric box (cube) at grid position (gx, gy, gz) with height `h` tiles.
 *
 * `padding` (0–1) shrinks the block footprint relative to the tile size so
 * there is a visible gap between adjacent blocks and the grid edges.
 * A value of 0.1 means 10% inset on every side.
 */
export function boxPaths(
	gx: number,
	gy: number,
	gz: number,
	h: number,
	cfg: IsoConfig,
	padding = 0.1
): { top: string; left: string; right: string } {
	const th = cfg.tileSize;
	const scale = 1 - padding;
	const hw = cfg.tileSize * scale; // half tile width (inset by padding)
	const hh = (cfg.tileSize / 2) * scale; // half tile height (inset by padding)
	const pixelH = h * th; // height in pixels

	// Centre of the top tile
	const { x, y } = isoToScreen(gx, gy, gz + h, cfg);

	// Top face (diamond)
	const top = `M ${x},${y - hh} L ${x + hw},${y} L ${x},${y + hh} L ${x - hw},${y} Z`;

	// Left face (parallelogram going down-left)
	const left = [
		`M ${x - hw},${y}`,
		`L ${x},${y + hh}`,
		`L ${x},${y + hh + pixelH}`,
		`L ${x - hw},${y + pixelH}`,
		'Z'
	].join(' ');

	// Right face (parallelogram going down-right)
	const right = [
		`M ${x},${y + hh}`,
		`L ${x + hw},${y}`,
		`L ${x + hw},${y + pixelH}`,
		`L ${x},${y + hh + pixelH}`,
		'Z'
	].join(' ');

	return { top, left, right };
}

/**
 * How far (as a fraction of tileSize) an edge's endpoint is pulled back along
 * its arriving leg. Because edges paint *below* the node cubes, a connector
 * aimed at a node's centre would bury its arrowhead inside the destination box.
 * Insetting the tip lands the arrowhead just outside the cube's near face where
 * it is actually visible.
 */
const EDGE_END_INSET = 0.62;

/**
 * Given the screen-space `base` an edge arrives from and the `rawTip` at the
 * destination node's centre, return the inset tip (pulled back out of the cube)
 * and the unit direction of travel. When the leg is degenerate (zero length)
 * the tip is left at the destination and the direction is zero.
 */
function arrowArrival(
	base: ScreenPoint,
	rawTip: ScreenPoint,
	cfg: IsoConfig
): { tip: ScreenPoint; ux: number; uy: number } {
	const dx = rawTip.x - base.x;
	const dy = rawTip.y - base.y;
	const len = Math.sqrt(dx * dx + dy * dy);
	if (len < 1e-6) return { tip: rawTip, ux: 0, uy: 0 };
	const ux = dx / len;
	const uy = dy / len;
	// Never inset past the leg's own start, so very short edges keep an endpoint.
	const gap = Math.min(cfg.tileSize * EDGE_END_INSET, len * 0.9);
	return { tip: { x: rawTip.x - ux * gap, y: rawTip.y - uy * gap }, ux, uy };
}

/**
 * Compute an SVG path from a source grid position to a target grid position
 * using a two-segment L-shaped route in isometric space, with a rounded elbow
 * at the corner. The endpoint is inset out of the destination cube (see
 * {@link arrowArrival}) so a directed edge's arrowhead reads clearly.
 *
 * When a leg is too short to round (or degenerate), the corner falls back to a
 * sharp `M…L…L` elbow.
 */
export function edgePath(
	fromX: number,
	fromY: number,
	fromZ: number,
	toX: number,
	toY: number,
	toZ: number,
	cfg: IsoConfig,
	radius = cfg.tileSize * 0.4
): string {
	const from = isoToScreen(fromX, fromY, fromZ + 0.5, cfg);
	const corner = isoToScreen(toX, fromY, (fromZ + toZ) / 2 + 0.5, cfg);
	// Inset the endpoint along the same arriving leg the arrowhead uses, so the
	// line meets the arrowhead exactly.
	const base = isoToScreen(toX, fromY, toZ + 0.5, cfg);
	const rawTo = isoToScreen(toX, toY, toZ + 0.5, cfg);
	const { tip: to } = arrowArrival(base, rawTo, cfg);

	const v1x = corner.x - from.x;
	const v1y = corner.y - from.y;
	const v2x = to.x - corner.x;
	const v2y = to.y - corner.y;
	const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
	const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

	// Cap the fillet so it never eats more than half of either leg.
	const r = Math.min(radius, len1 / 2, len2 / 2);
	if (!(r > 0.5) || len1 === 0 || len2 === 0) {
		return `M ${from.x},${from.y} L ${corner.x},${corner.y} L ${to.x},${to.y}`;
	}

	const p1x = corner.x - (v1x / len1) * r;
	const p1y = corner.y - (v1y / len1) * r;
	const p2x = corner.x + (v2x / len2) * r;
	const p2y = corner.y + (v2y / len2) * r;
	return `M ${from.x},${from.y} L ${p1x},${p1y} Q ${corner.x},${corner.y} ${p2x},${p2y} L ${to.x},${to.y}`;
}

/**
 * Build an SVG arrowhead polygon for a barbed chevron, pointing from `tip`
 * along the unit direction (`ux`, `uy`). The shape has a tip, two swept-back
 * barbs and a concave notch at the rear so it reads as a crisp arrow rather
 * than a flat triangle. `size` is the length from tip to barb, `width` the
 * half-spread of the barbs. Returns a <polygon> `points` string.
 */
function arrowPolygon(
	tip: ScreenPoint,
	ux: number,
	uy: number,
	size: number,
	width: number
): string {
	const px = -uy; // perpendicular unit
	const py = ux;
	const notch = size * 0.42; // how deep the rear concavity cuts in
	return [
		`${tip.x},${tip.y}`,
		`${tip.x - ux * size - px * width},${tip.y - uy * size - py * width}`,
		`${tip.x - ux * notch},${tip.y - uy * notch}`,
		`${tip.x - ux * size + px * width},${tip.y - uy * size + py * width}`
	].join(' ');
}

/**
 * Compute an SVG arrowhead polygon at the endpoint of an edge. The tip is inset
 * out of the destination cube (matching {@link edgePath}) and the arrowhead is
 * sized relative to `tileSize` so it stays proportional at any scale.
 * Returns a `points` string suitable for a <polygon> element.
 */
export function arrowHead(
	toX: number,
	toY: number,
	toZ: number,
	fromX: number,
	fromY: number,
	cfg: IsoConfig
): string {
	const base = isoToScreen(toX, fromY, toZ + 0.5, cfg);
	const rawTip = isoToScreen(toX, toY, toZ + 0.5, cfg);
	const { tip, ux, uy } = arrowArrival(base, rawTip, cfg);
	return arrowPolygon(tip, ux, uy, cfg.tileSize * 0.26, cfg.tileSize * 0.13);
}

/**
 * Compute the SVG path for a straight flat arrow from (fromX, fromY) to (toX, toY)
 * lying on the ground at the given z level.
 */
export function flatArrowPath(
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
	z: number,
	cfg: IsoConfig
): string {
	const from = isoToScreen(fromX, fromY, z, cfg);
	const to = isoToScreen(toX, toY, z, cfg);
	return `M ${from.x},${from.y} L ${to.x},${to.y}`;
}

/**
 * Compute an SVG arrowhead polygon for a flat arrow pointing from (fromX, fromY)
 * to (toX, toY) on the ground at the given z level.
 * Returns a `points` string for a <polygon> element.
 */
export function flatArrowHead(
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
	z: number,
	cfg: IsoConfig
): string {
	const tip = isoToScreen(toX, toY, z, cfg);
	const base = isoToScreen(fromX, fromY, z, cfg);
	const dx = tip.x - base.x;
	const dy = tip.y - base.y;
	const len = Math.sqrt(dx * dx + dy * dy) || 1;
	const ux = dx / len;
	const uy = dy / len;
	// Flat arrows sit on the ground (never buried under a cube), so the tip stays
	// at the destination. Sized a touch larger than edge arrowheads.
	return arrowPolygon(tip, ux, uy, cfg.tileSize * 0.3, cfg.tileSize * 0.15);
}

/**
 * Build the SVG path for a flat w × d tile area on the isometric ground.
 * `gx`, `gy` are the top corner grid position; `w` tiles extend along x, `d` along y.
 * The result is a diamond-shaped quadrilateral outline of the area.
 */
export function floorTilePath(
	gx: number,
	gy: number,
	gz: number,
	w: number,
	d: number,
	cfg: IsoConfig
): string {
	const hh = cfg.tileSize / 2;
	const hw = cfg.tileSize;
	const topCenter = isoToScreen(gx, gy, gz, cfg);
	const rightCenter = isoToScreen(gx + w - 1, gy, gz, cfg);
	const bottomCenter = isoToScreen(gx + w - 1, gy + d - 1, gz, cfg);
	const leftCenter = isoToScreen(gx, gy + d - 1, gz, cfg);
	const top = { x: topCenter.x, y: topCenter.y - hh };
	const right = { x: rightCenter.x + hw, y: rightCenter.y };
	const bottom = { x: bottomCenter.x, y: bottomCenter.y + hh };
	const left = { x: leftCenter.x - hw, y: leftCenter.y };
	return `M ${top.x},${top.y} L ${right.x},${right.y} L ${bottom.x},${bottom.y} L ${left.x},${left.y} Z`;
}

/** Compute the bounding box (in screen space) for a set of grid positions. */
export function boundingBox(
	positions: Array<{ x: number; y: number; z?: number }>,
	cfg: IsoConfig
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
	if (positions.length === 0) {
		return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
	}
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const p of positions) {
		const s = isoToScreen(p.x, p.y, p.z ?? 0, cfg);
		const hw = cfg.tileSize;
		const hh = cfg.tileSize / 2;
		minX = Math.min(minX, s.x - hw);
		minY = Math.min(minY, s.y - hh - cfg.tileSize);
		maxX = Math.max(maxX, s.x + hw);
		maxY = Math.max(maxY, s.y + hh);
	}
	return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
