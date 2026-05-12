import type { NodeType, EdgeType } from '../types/diagram.js';

export interface Theme {
	background: string;
	gridLine: string;
	text: string;
	textSecondary: string;
	edge: string;
	edgeArrow: string;
	groupFill: string;
	groupStroke: string;
}

export const lightTheme: Theme = {
	background: '#f8f9fa',
	gridLine: '#dee2e6',
	text: '#212529',
	textSecondary: '#6c757d',
	edge: '#495057',
	edgeArrow: '#343a40',
	groupFill: 'rgba(13,110,253,0.06)',
	groupStroke: 'rgba(13,110,253,0.3)'
};

export const darkTheme: Theme = {
	background: '#0d1117',
	gridLine: '#21262d',
	text: '#e6edf3',
	textSecondary: '#8b949e',
	edge: '#8b949e',
	edgeArrow: '#c9d1d9',
	groupFill: 'rgba(56,139,253,0.08)',
	groupStroke: 'rgba(56,139,253,0.4)'
};

/** Colours for node faces based on node type. */
export interface NodeColours {
	top: string;
	left: string;
	right: string;
	stroke: string;
	icon: string;
}

const NODE_COLOURS: Record<NodeType, NodeColours> = {
	server: { top: '#2d6a4f', left: '#1b4332', right: '#40916c', stroke: '#74c69d', icon: '🖥️' },
	service: { top: '#1d3557', left: '#0d1b2a', right: '#457b9d', stroke: '#a8dadc', icon: '⚙️' },
	database: { top: '#4a1942', left: '#2d1b3d', right: '#7b2d8b', stroke: '#c77dff', icon: '🗄️' },
	loadbalancer: {
		top: '#7b3f00',
		left: '#4a2500',
		right: '#a05c10',
		stroke: '#f4a261',
		icon: '⚖️'
	},
	gateway: { top: '#003566', left: '#001d3d', right: '#0077b6', stroke: '#90e0ef', icon: '🌐' },
	queue: { top: '#5c3317', left: '#3b1f0a', right: '#8b4513', stroke: '#dda15e', icon: '📦' },
	storage: { top: '#3a3a3a', left: '#1c1c1c', right: '#5a5a5a', stroke: '#aaaaaa', icon: '💾' },
	warehouse: { top: '#4a5568', left: '#2d3748', right: '#718096', stroke: '#e2e8f0', icon: '🏭' },
	dock: { top: '#1a535c', left: '#0d2b30', right: '#2a9d8f', stroke: '#80ced6', icon: '⚓' },
	truck: { top: '#cc3b16', left: '#8b2510', right: '#e76f51', stroke: '#f4a261', icon: '🚚' },
	box: { top: '#936639', left: '#6b4226', right: '#c28855', stroke: '#dbb88a', icon: '📫' },
	person: { top: '#2b6cb0', left: '#1a4a80', right: '#4299e1', stroke: '#90cdf4', icon: '👤' },
	cloud: { top: '#718096', left: '#4a5568', right: '#a0aec0', stroke: '#e2e8f0', icon: '☁️' },
	router: { top: '#276749', left: '#1c4532', right: '#38a169', stroke: '#9ae6b4', icon: '📡' },
	generic: { top: '#4a5568', left: '#2d3748', right: '#718096', stroke: '#e2e8f0', icon: '◼' }
};

export function getNodeColours(type: NodeType | undefined): NodeColours {
	return NODE_COLOURS[type ?? 'generic'] ?? NODE_COLOURS['generic'];
}

const EDGE_COLOURS: Record<EdgeType, string> = {
	network: '#4299e1',
	flow: '#48bb78',
	dependency: '#ed8936',
	data: '#9f7aea',
	generic: '#718096'
};

export function getEdgeColour(type: EdgeType | undefined): string {
	return EDGE_COLOURS[type ?? 'generic'] ?? EDGE_COLOURS['generic'];
}
