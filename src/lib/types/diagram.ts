/** Supported node types for isometric rendering */
export type NodeType =
	| 'server'
	| 'service'
	| 'database'
	| 'loadbalancer'
	| 'gateway'
	| 'queue'
	| 'storage'
	| 'warehouse'
	| 'dock'
	| 'truck'
	| 'box'
	| 'person'
	| 'cloud'
	| 'router'
	| 'generic';

/** Supported edge types */
export type EdgeType = 'network' | 'flow' | 'dependency' | 'data' | 'generic';

/** Supported diagram types */
export type DiagramType = 'networking' | 'warehouse' | 'flow' | 'generic';

/** 2D grid position */
export interface Position {
	x: number;
	y: number;
	/** Optional z-layer (height) */
	z?: number;
}

/** Visual style overrides */
export interface StyleOverride {
	color?: string;
	fillColor?: string;
	strokeColor?: string;
	labelColor?: string;
	opacity?: number;
}

/** A single node in the diagram */
export interface DiagramNode {
	id: string;
	label: string;
	type?: NodeType;
	position: Position;
	/** Short descriptive text shown below the label */
	description?: string;
	style?: StyleOverride;
	/** Extra key/value metadata (e.g. region, version, status) */
	meta?: Record<string, string>;
}

/** A directed or undirected connection between two nodes */
export interface DiagramEdge {
	id?: string;
	from: string;
	to: string;
	label?: string;
	type?: EdgeType;
	/** Whether to draw an arrowhead */
	directed?: boolean;
	style?: StyleOverride;
}

/** A flat arrow lying on the isometric ground plane, going from one grid position to another */
export interface DiagramFlatArrow {
	id?: string;
	/** Starting grid position */
	from: Position;
	/** Ending grid position */
	to: Position;
	label?: string;
	/** Whether to draw an arrowhead at the end (default true) */
	directed?: boolean;
	style?: StyleOverride;
}

/** A flat (ground-level) tile area used to colour the floor or mark a bordered region */
export interface DiagramFloorTile {
	id?: string;
	/** Top corner grid position of the tile area */
	position: Position;
	/** Width in tiles along the x-axis (default 1) */
	width?: number;
	/** Depth in tiles along the y-axis (default 1) */
	depth?: number;
	label?: string;
	style?: StyleOverride;
}

/** A logical group that highlights a set of nodes */
export interface DiagramGroup {
	id: string;
	label: string;
	/** Node IDs that belong to this group */
	nodes: string[];
	color?: string;
	style?: StyleOverride;
}

/** Global diagram settings */
export interface DiagramSettings {
	theme?: 'light' | 'dark';
	/** Base tile size in pixels (default 64) */
	tileSize?: number;
	/** Show a subtle isometric grid */
	showGrid?: boolean;
	/** Padding around the diagram content in tiles */
	padding?: number;
}

/** Top-level diagram specification (maps 1-to-1 with YAML) */
export interface DiagramSpec {
	title: string;
	type?: DiagramType;
	description?: string;
	settings?: DiagramSettings;
	nodes: DiagramNode[];
	edges?: DiagramEdge[];
	groups?: DiagramGroup[];
	/** Flat arrows lying on the ground plane */
	flatArrows?: DiagramFlatArrow[];
	/** Flat tile areas on the ground used for floor colouring or area borders */
	floorTiles?: DiagramFloorTile[];
}
