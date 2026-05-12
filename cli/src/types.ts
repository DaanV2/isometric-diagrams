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
	z?: number;
}

/** A single node in the diagram */
export interface DiagramNode {
	id: string;
	label: string;
	type?: NodeType;
	position: Position;
	description?: string;
	meta?: Record<string, string>;
}

/** A directed or undirected connection between two nodes */
export interface DiagramEdge {
	id?: string;
	from: string;
	to: string;
	label?: string;
	type?: EdgeType;
	directed?: boolean;
}

/** A logical group that highlights a set of nodes */
export interface DiagramGroup {
	id: string;
	label: string;
	nodes: string[];
	color?: string;
}

/** Global diagram settings */
export interface DiagramSettings {
	theme?: 'light' | 'dark';
	tileSize?: number;
	showGrid?: boolean;
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
