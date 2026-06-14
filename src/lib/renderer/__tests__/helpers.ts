import type { DiagramNode, DiagramEdge, DiagramFlatArrow, DiagramFloorTile } from '../../types/diagram.js';

export const TILE = 100;
export const cfg = { tileSize: TILE };

/** Extract all numeric tokens from an SVG path string. */
export function pathNumbers(path: string): number[] {
	return path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
}

export function makeNode(id: string, x: number, y: number, z?: number): DiagramNode {
	return {
		id,
		label: id,
		position: { x, y, ...(z !== undefined ? { z } : {}) }
	};
}

export function makeEdge(from: string, to: string): DiagramEdge {
	return { from, to };
}

export function makeArrow(
	fx: number,
	fy: number,
	tx: number,
	ty: number,
	opts: Partial<DiagramFlatArrow> = {}
): DiagramFlatArrow {
	return { from: { x: fx, y: fy }, to: { x: tx, y: ty }, ...opts };
}

export function makeTile(
	x: number,
	y: number,
	opts: Partial<DiagramFloorTile> = {}
): DiagramFloorTile {
	return { position: { x, y }, ...opts };
}
