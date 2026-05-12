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
 */
export function boxPaths(
	gx: number,
	gy: number,
	gz: number,
	h: number,
	cfg: IsoConfig
): { top: string; left: string; right: string } {
	const th = cfg.tileSize;
	const hw = cfg.tileSize; // half tile width
	const hh = cfg.tileSize / 2; // half tile height
	const pixelH = h * th; // height in pixels

	// Centre of the top tile
	const { x, y } = isoToScreen(gx, gy, gz + h, cfg);

	// Top face (diamond)
	const top = `M ${x},${y - hh} L ${x + hw},${y} L ${x},${y + hh} L ${x - hw},${y} Z`;

	// Left face (parallelogram going down-left)
	const leftTop = isoToScreen(gx, gy, gz + h, cfg);
	const left = [
		`M ${leftTop.x - hw},${leftTop.y}`,
		`L ${leftTop.x},${leftTop.y + hh}`,
		`L ${leftTop.x},${leftTop.y + hh + pixelH}`,
		`L ${leftTop.x - hw},${leftTop.y + pixelH}`,
		'Z'
	].join(' ');

	// Right face (parallelogram going down-right)
	const right = [
		`M ${leftTop.x},${leftTop.y + hh}`,
		`L ${leftTop.x + hw},${leftTop.y}`,
		`L ${leftTop.x + hw},${leftTop.y + pixelH}`,
		`L ${leftTop.x},${leftTop.y + hh + pixelH}`,
		'Z'
	].join(' ');

	return { top, left, right };
}

/**
 * Compute an SVG polyline from a source grid position to a target grid position
 * using a two-segment L-shaped path in isometric space.
 */
export function edgePath(
	fromX: number,
	fromY: number,
	fromZ: number,
	toX: number,
	toY: number,
	toZ: number,
	cfg: IsoConfig
): string {
	const from = isoToScreen(fromX, fromY, fromZ + 0.5, cfg);
	const mid = isoToScreen(toX, fromY, (fromZ + toZ) / 2 + 0.5, cfg);
	const to = isoToScreen(toX, toY, toZ + 0.5, cfg);
	return `M ${from.x},${from.y} L ${mid.x},${mid.y} L ${to.x},${to.y}`;
}

/**
 * Compute an SVG arrowhead polygon at the endpoint of an edge.
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
	const tip = isoToScreen(toX, toY, toZ + 0.5, cfg);
	const base = isoToScreen(fromX, toY, toZ + 0.5, cfg);
	const dx = tip.x - base.x;
	const dy = tip.y - base.y;
	const len = Math.sqrt(dx * dx + dy * dy) || 1;
	const ux = dx / len;
	const uy = dy / len;
	const size = 8;
	const w = 4;
	return [
		`${tip.x},${tip.y}`,
		`${tip.x - ux * size - uy * w},${tip.y - uy * size + ux * w}`,
		`${tip.x - ux * size + uy * w},${tip.y - uy * size - ux * w}`
	].join(' ');
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
