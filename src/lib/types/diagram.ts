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
}
