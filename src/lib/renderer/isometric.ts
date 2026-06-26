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

/** A point in grid (ground-plane) coordinates. */
export interface GridPoint {
	x: number;
	y: number;
}

/**
 * Default half-width of a connector ribbon, in **grid units**. The band is laid
 * out and offset in grid space (the ground plane) so it foreshortens correctly
 * under the isometric projection — it reads as a strip of tape stuck to the
 * floor rather than a floating line.
 */
export const RIBBON_HALF_WIDTH = 0.12;

/** Drop consecutive duplicate points so degenerate legs don't break offsetting. */
function dedupe(pts: GridPoint[]): GridPoint[] {
	const out: GridPoint[] = [];
	for (const p of pts) {
		const last = out[out.length - 1];
		if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-9) out.push({ x: p.x, y: p.y });
	}
	return out;
}

/** Unit direction (in grid space) from `a` to `b`. */
function unit(a: GridPoint, b: GridPoint): GridPoint {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const l = Math.hypot(dx, dy) || 1;
	return { x: dx / l, y: dy / l };
}

/**
 * Build a filled SVG path for a flat "ribbon" lying on the ground plane (at
 * height `z`), following a polyline given in grid coordinates. The band keeps a
 * constant width of `2 * halfWidth` **grid units**; because the offset is taken
 * in grid (ground) space and only then projected, the ribbon foreshortens like
 * a real strip on the floor. Mitred joins keep the corners crisp. Returns a
 * closed `M … L … Z` outline suitable for a filled <path>.
 */
export function ribbonPath(
	pts: GridPoint[],
	z: number,
	cfg: IsoConfig,
	halfWidth = RIBBON_HALF_WIDTH
): string {
	const p = dedupe(pts);
	if (p.length < 2) return '';

	const left: GridPoint[] = [];
	const right: GridPoint[] = [];
	for (let i = 0; i < p.length; i++) {
		const dPrev = i > 0 ? unit(p[i - 1], p[i]) : null;
		const dNext = i < p.length - 1 ? unit(p[i], p[i + 1]) : null;
		// Left normal of a direction (dx,dy) is (-dy,dx).
		const nPrev = dPrev ? { x: -dPrev.y, y: dPrev.x } : null;
		const nNext = dNext ? { x: -dNext.y, y: dNext.x } : null;

		let nx: number;
		let ny: number;
		let scale = 1;
		if (nPrev && nNext) {
			// Miter join: average the two segment normals and lengthen so the band
			// keeps its width through the corner.
			let mx = nPrev.x + nNext.x;
			let my = nPrev.y + nNext.y;
			const ml = Math.hypot(mx, my) || 1;
			mx /= ml;
			my /= ml;
			const denom = mx * nNext.x + my * nNext.y || 1;
			scale = Math.min(1 / denom, 4); // cap so sharp turns don't spike
			nx = mx;
			ny = my;
		} else {
			const n = (nPrev ?? nNext)!;
			nx = n.x;
			ny = n.y;
		}
		const off = halfWidth * scale;
		left.push({ x: p[i].x + nx * off, y: p[i].y + ny * off });
		right.push({ x: p[i].x - nx * off, y: p[i].y - ny * off });
	}

	const outline = [...left, ...right.reverse()].map((g) => isoToScreen(g.x, g.y, z, cfg));
	return 'M ' + outline.map((s) => `${s.x},${s.y}`).join(' L ') + ' Z';
}

/**
 * Project a grid-space polyline to an `M … L …` SVG path on the ground plane.
 * Used to paint the thin gloss "spine" running down the centre of a ribbon.
 */
export function polylinePath(pts: GridPoint[], z: number, cfg: IsoConfig): string {
	const p = dedupe(pts);
	if (p.length < 2) return '';
	const s = p.map((g) => isoToScreen(g.x, g.y, z, cfg));
	return 'M ' + s.map((q) => `${q.x},${q.y}`).join(' L ');
}

/**
 * Build a flat, ground-plane arrowhead polygon pointing from `from` toward `to`
 * (both grid coordinates) at height `z`. The barbed chevron — tip, two
 * swept-back barbs and a rear notch — is shaped in grid space and projected, so
 * it lies on the floor in line with its ribbon. `length` and `halfWidth` are in
 * grid units. Returns a <polygon> `points` string.
 */
export function ribbonArrowHead(
	from: GridPoint,
	to: GridPoint,
	z: number,
	cfg: IsoConfig,
	length = 0.5,
	halfWidth = 0.26
): string {
	const u = unit(from, to);
	const px = -u.y; // perpendicular unit (grid space)
	const py = u.x;
	const baseCx = to.x - u.x * length;
	const baseCy = to.y - u.y * length;
	const notch = length * 0.55; // depth of the rear concavity
	const verts: GridPoint[] = [
		to,
		{ x: baseCx + px * halfWidth, y: baseCy + py * halfWidth },
		{ x: to.x - u.x * notch, y: to.y - u.y * notch },
		{ x: baseCx - px * halfWidth, y: baseCy - py * halfWidth }
	];
	return verts.map((g) => isoToScreen(g.x, g.y, z, cfg)).map((s) => `${s.x},${s.y}`).join(' ');
}

/**
 * Pull the first and last vertices of a route inward along their own end
 * segments by the given grid-unit insets, returning a new route. Used so a
 * connector ribbon starts/stops clear of the cube footprints it joins (an
 * arrowhead aimed at a node centre would otherwise be buried under the box).
 */
export function insetRouteEnds(
	route: GridPoint[],
	startInset: number,
	endInset: number
): GridPoint[] {
	const r = dedupe(route).map((p) => ({ ...p }));
	if (r.length < 2) return r;
	const pull = (a: GridPoint, b: GridPoint, inset: number) => {
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const l = Math.hypot(dx, dy);
		if (l < 1e-9) return;
		const t = Math.min(inset, l * 0.9) / l;
		a.x += dx * t;
		a.y += dy * t;
	};
	pull(r[0], r[1], startInset);
	pull(r[r.length - 1], r[r.length - 2], endInset);
	return r;
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
