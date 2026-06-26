import type { NodeType, EdgeType } from '../types/diagram.js';

export interface Theme {
	background: string;
	/** Second colour for the background radial gradient (centre → edge). */
	backgroundAccent: string;
	gridLine: string;
	text: string;
	textSecondary: string;
	edge: string;
	edgeArrow: string;
	groupFill: string;
	groupStroke: string;
	/** Colour of the soft contact shadow cast on the ground under each node. */
	shadow: string;
}

export const lightTheme: Theme = {
	background: '#eef1f6',
	backgroundAccent: '#fbfcfe',
	gridLine: '#c9d2e0',
	text: '#1b2430',
	textSecondary: '#5b6675',
	edge: '#5b6675',
	edgeArrow: '#3a424f',
	groupFill: 'rgba(37,99,235,0.05)',
	groupStroke: 'rgba(37,99,235,0.28)',
	shadow: 'rgba(40,52,74,0.18)'
};

export const darkTheme: Theme = {
	background: '#0a0e16',
	backgroundAccent: '#141b27',
	gridLine: '#222c3c',
	text: '#eef2f8',
	textSecondary: '#8b97a8',
	edge: '#9aa6b8',
	edgeArrow: '#cdd6e3',
	groupFill: 'rgba(96,165,250,0.06)',
	groupStroke: 'rgba(96,165,250,0.35)',
	shadow: 'rgba(0,0,0,0.45)'
};

/** Colours for node faces based on node type. */
export interface NodeColours {
	top: string;
	left: string;
	right: string;
	stroke: string;
	icon: string;
}

// ─── Colour shading helpers ───────────────────────────────────────────────────
// Faces are derived from one base hue per type so every cube is lit consistently:
// the top face catches the most light, the right face sits at the base tone, and
// the left face falls into shadow. This is what makes the boxes read as solid 3-D.

function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	return [
		parseInt(h.slice(0, 2), 16),
		parseInt(h.slice(2, 4), 16),
		parseInt(h.slice(4, 6), 16)
	];
}

function rgbToHex(r: number, g: number, b: number): string {
	const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
	return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix a colour toward white (amount > 0) or black (amount < 0); amount in [-1, 1]. */
function shade(hex: string, amount: number): string {
	const [r, g, b] = hexToRgb(hex);
	const target = amount >= 0 ? 255 : 0;
	const t = Math.abs(amount);
	return rgbToHex(r + (target - r) * t, g + (target - g) * t, b + (target - b) * t);
}

/** Build a consistently-lit face set from a single base colour. */
function faces(base: string, icon: string): NodeColours {
	return {
		top: shade(base, 0.26), // brightest — light from above
		right: base, // mid tone — the lit side
		left: shade(base, -0.32), // darkest — the shadowed side
		stroke: shade(base, 0.5), // crisp lighter edge highlight
		icon
	};
}

/** Base hue per node type — a cohesive, modern palette. */
const NODE_BASE: Record<NodeType, { base: string; icon: string }> = {
	server: { base: '#22c55e', icon: '🖥️' },
	service: { base: '#6366f1', icon: '⚙️' },
	database: { base: '#a855f7', icon: '🗄️' },
	loadbalancer: { base: '#f59e0b', icon: '⚖️' },
	gateway: { base: '#06b6d4', icon: '🌐' },
	queue: { base: '#f97316', icon: '📦' },
	storage: { base: '#64748b', icon: '💾' },
	warehouse: { base: '#8b7d6b', icon: '🏭' },
	dock: { base: '#14b8a6', icon: '⚓' },
	truck: { base: '#ef4444', icon: '🚚' },
	box: { base: '#d9a441', icon: '📫' },
	person: { base: '#3b82f6', icon: '👤' },
	cloud: { base: '#94a3b8', icon: '☁️' },
	router: { base: '#10b981', icon: '📡' },
	generic: { base: '#7c8aa0', icon: '◼' }
};

const NODE_COLOURS: Record<NodeType, NodeColours> = Object.fromEntries(
	Object.entries(NODE_BASE).map(([type, { base, icon }]) => [type, faces(base, icon)])
) as Record<NodeType, NodeColours>;

export function getNodeColours(type: NodeType | undefined): NodeColours {
	return NODE_COLOURS[type ?? 'generic'] ?? NODE_COLOURS['generic'];
}

/** Base (mid-tone) colour for a node type — handy for glows, badges, accents. */
export function getNodeBaseColour(type: NodeType | undefined): string {
	return NODE_BASE[type ?? 'generic']?.base ?? NODE_BASE['generic'].base;
}

/** All valid node type names (runtime source of truth, mirrors the NodeType union). */
export const NODE_TYPE_NAMES = Object.keys(NODE_COLOURS) as NodeType[];

const EDGE_COLOURS: Record<EdgeType, string> = {
	network: '#60a5fa',
	flow: '#34d399',
	dependency: '#fbbf24',
	data: '#c084fc',
	generic: '#94a3b8'
};

export function getEdgeColour(type: EdgeType | undefined): string {
	return EDGE_COLOURS[type ?? 'generic'] ?? EDGE_COLOURS['generic'];
}

/** All valid edge type names (runtime source of truth, mirrors the EdgeType union). */
export const EDGE_TYPE_NAMES = Object.keys(EDGE_COLOURS) as EdgeType[];
