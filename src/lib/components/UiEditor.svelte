<script lang="ts">
	import type {
		DiagramSpec,
		DiagramNode,
		DiagramEdge,
		DiagramType,
		NodeType,
		EdgeType
	} from '$lib/types/diagram.js';

	interface Props {
		spec: DiagramSpec;
		onspecchange: (spec: DiagramSpec) => void;
	}

	let { spec, onspecchange }: Props = $props();

	const NODE_TYPES: NodeType[] = [
		'server',
		'service',
		'database',
		'loadbalancer',
		'gateway',
		'queue',
		'storage',
		'warehouse',
		'dock',
		'truck',
		'box',
		'person',
		'cloud',
		'router',
		'generic'
	];

	const EDGE_TYPES: EdgeType[] = ['network', 'flow', 'dependency', 'data', 'generic'];
	const DIAGRAM_TYPES: DiagramType[] = ['networking', 'warehouse', 'flow', 'generic'];

	const NODE_ICONS: Record<NodeType, string> = {
		server: '🖥',
		service: '⚙',
		database: '🗄',
		loadbalancer: '⚖',
		gateway: '🔀',
		queue: '📬',
		storage: '💾',
		warehouse: '🏭',
		dock: '⚓',
		truck: '🚚',
		box: '📦',
		person: '👤',
		cloud: '☁',
		router: '📡',
		generic: '◆'
	};

	// Track which node is expanded for editing
	let expandedNodeIndex = $state<number | null>(null);
	let expandedEdgeIndex = $state<number | null>(null);

	function emit(updated: Partial<DiagramSpec>) {
		onspecchange({ ...spec, ...updated });
	}

	function setTitle(e: Event) {
		emit({ title: (e.currentTarget as HTMLInputElement).value });
	}

	function setDiagramType(e: Event) {
		emit({ type: (e.currentTarget as HTMLSelectElement).value as DiagramType });
	}

	function setDescription(e: Event) {
		emit({ description: (e.currentTarget as HTMLTextAreaElement).value || undefined });
	}

	// ── Node operations ──────────────────────────────────────────

	function addNode() {
		const existingIds = new Set(spec.nodes.map((n) => n.id));
		let idx = spec.nodes.length + 1;
		let newId = `node-${idx}`;
		while (existingIds.has(newId)) newId = `node-${++idx}`;

		const newNode: DiagramNode = {
			id: newId,
			label: 'New Node',
			type: 'generic',
			position: { x: 0, y: 0 }
		};
		const nodes = [...spec.nodes, newNode];
		emit({ nodes });
		expandedNodeIndex = nodes.length - 1;
	}

	function removeNode(index: number) {
		const nodes = spec.nodes.filter((_, i) => i !== index);
		// Remove edges referencing the deleted node
		const removedId = spec.nodes[index].id;
		const edges = (spec.edges ?? []).filter((e) => e.from !== removedId && e.to !== removedId);
		emit({ nodes, edges });
		if (expandedNodeIndex === index) expandedNodeIndex = null;
	}

	function updateNode(index: number, patch: Partial<DiagramNode>) {
		const nodes = spec.nodes.map((n, i) => (i === index ? { ...n, ...patch } : n));
		emit({ nodes });
	}

	function updateNodeField(index: number, field: string, value: string | number) {
		updateNode(index, { [field]: value } as Partial<DiagramNode>);
	}

	function updateNodePosition(index: number, axis: 'x' | 'y', raw: string) {
		const val = parseFloat(raw);
		if (!isNaN(val)) {
			const pos = { ...spec.nodes[index].position, [axis]: val };
			updateNode(index, { position: pos });
		}
	}

	// ── Edge operations ──────────────────────────────────────────

	function addEdge() {
		const firstId = spec.nodes[0]?.id ?? '';
		const secondId = spec.nodes[1]?.id ?? '';
		const newEdge: DiagramEdge = { from: firstId, to: secondId, type: 'network' };
		const edges = [...(spec.edges ?? []), newEdge];
		emit({ edges });
		expandedEdgeIndex = edges.length - 1;
	}

	function removeEdge(index: number) {
		const edges = (spec.edges ?? []).filter((_, i) => i !== index);
		emit({ edges });
		if (expandedEdgeIndex === index) expandedEdgeIndex = null;
	}

	function updateEdge(index: number, patch: Partial<DiagramEdge>) {
		const edges = (spec.edges ?? []).map((e, i) => (i === index ? { ...e, ...patch } : e));
		emit({ edges });
	}

	function updateEdgeField(index: number, field: string, value: string | boolean) {
		updateEdge(index, { [field]: value } as Partial<DiagramEdge>);
	}

	function toggleNode(index: number) {
		expandedNodeIndex = expandedNodeIndex === index ? null : index;
	}

	function toggleEdge(index: number) {
		expandedEdgeIndex = expandedEdgeIndex === index ? null : index;
	}
</script>

<div class="ui-editor" aria-label="UI diagram editor">
	<!-- Diagram Settings -->
	<section class="section">
		<h3 class="section-title">Diagram</h3>
		<div class="field-row">
			<label class="field-label" for="diag-title">Title</label>
			<input
				id="diag-title"
				class="field-input"
				type="text"
				value={spec.title}
				oninput={setTitle}
				aria-label="Diagram title"
			/>
		</div>
		<div class="field-row">
			<label class="field-label" for="diag-type">Type</label>
			<select
				id="diag-type"
				class="field-select"
				value={spec.type ?? 'generic'}
				onchange={setDiagramType}
				aria-label="Diagram type"
			>
				{#each DIAGRAM_TYPES as dt (dt)}
					<option value={dt}>{dt}</option>
				{/each}
			</select>
		</div>
		<div class="field-row field-row--col">
			<label class="field-label" for="diag-desc">Description</label>
			<textarea
				id="diag-desc"
				class="field-textarea"
				value={spec.description ?? ''}
				oninput={setDescription}
				aria-label="Diagram description"
				rows="2"
			></textarea>
		</div>
	</section>

	<!-- Nodes -->
	<section class="section">
		<div class="section-header">
			<h3 class="section-title">Nodes <span class="count">({spec.nodes.length})</span></h3>
			<button class="add-btn" onclick={addNode} aria-label="Add node">＋ Add Node</button>
		</div>

		{#if spec.nodes.length === 0}
			<p class="empty-hint">No nodes yet. Click "Add Node" to get started.</p>
		{/if}

		<ul class="item-list" aria-label="Nodes list">
			{#each spec.nodes as node, i (node.id + i)}
				<li class="item" class:expanded={expandedNodeIndex === i}>
					<div class="item-header">
						<button
							class="item-expand"
							onclick={() => toggleNode(i)}
							aria-expanded={expandedNodeIndex === i}
							aria-label="Edit node {node.label}"
						>
							<span class="item-icon" aria-hidden="true"
								>{NODE_ICONS[node.type ?? 'generic']}</span
							>
							<span class="item-name">{node.label}</span>
							<span class="item-badge">{node.type ?? 'generic'}</span>
							<span class="item-pos">({node.position.x}, {node.position.y})</span>
						</button>
						<button
							class="delete-btn"
							onclick={() => removeNode(i)}
							aria-label="Delete node {node.label}"
							title="Delete node"
						>
							✕
						</button>
					</div>

					{#if expandedNodeIndex === i}
						<div class="item-body">
							<div class="field-row">
								<label class="field-label" for="node-id-{i}">ID</label>
								<input
									id="node-id-{i}"
									class="field-input"
									type="text"
									value={node.id}
									oninput={(e) =>
										updateNodeField(i, 'id', (e.currentTarget as HTMLInputElement).value)}
									aria-label="Node ID"
								/>
							</div>
							<div class="field-row">
								<label class="field-label" for="node-label-{i}">Label</label>
								<input
									id="node-label-{i}"
									class="field-input"
									type="text"
									value={node.label}
									oninput={(e) =>
										updateNodeField(i, 'label', (e.currentTarget as HTMLInputElement).value)}
									aria-label="Node label"
								/>
							</div>
							<div class="field-row">
								<label class="field-label" for="node-type-{i}">Type</label>
								<select
									id="node-type-{i}"
									class="field-select"
									value={node.type ?? 'generic'}
									onchange={(e) =>
										updateNodeField(
											i,
											'type',
											(e.currentTarget as HTMLSelectElement).value
										)}
									aria-label="Node type"
								>
									{#each NODE_TYPES as nt (nt)}
										<option value={nt}>{NODE_ICONS[nt]} {nt}</option>
									{/each}
								</select>
							</div>
							<div class="field-row">
								<span class="field-label">Position</span>
								<div class="pos-inputs">
									<label class="pos-label" for="node-x-{i}">X</label>
									<input
										id="node-x-{i}"
										class="field-input pos-input"
										type="number"
										value={node.position.x}
										oninput={(e) =>
											updateNodePosition(
												i,
												'x',
												(e.currentTarget as HTMLInputElement).value
											)}
										aria-label="Node X position"
									/>
									<label class="pos-label" for="node-y-{i}">Y</label>
									<input
										id="node-y-{i}"
										class="field-input pos-input"
										type="number"
										value={node.position.y}
										oninput={(e) =>
											updateNodePosition(
												i,
												'y',
												(e.currentTarget as HTMLInputElement).value
											)}
										aria-label="Node Y position"
									/>
								</div>
							</div>
							<div class="field-row field-row--col">
								<label class="field-label" for="node-desc-{i}">Description</label>
								<input
									id="node-desc-{i}"
									class="field-input"
									type="text"
									value={node.description ?? ''}
									oninput={(e) =>
										updateNodeField(
											i,
											'description',
											(e.currentTarget as HTMLInputElement).value || ''
										)}
									aria-label="Node description"
								/>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<!-- Edges -->
	<section class="section">
		<div class="section-header">
			<h3 class="section-title">
				Edges <span class="count">({(spec.edges ?? []).length})</span>
			</h3>
			<button class="add-btn" onclick={addEdge} aria-label="Add edge" disabled={spec.nodes.length < 2}>
				＋ Add Edge
			</button>
		</div>

		{#if (spec.edges ?? []).length === 0}
			<p class="empty-hint">No edges yet.{spec.nodes.length >= 2 ? ' Click "Add Edge" to connect nodes.' : ' Add at least 2 nodes first.'}</p>
		{/if}

		<ul class="item-list" aria-label="Edges list">
			{#each spec.edges ?? [] as edge, i (edge.from + edge.to + i)}
				<li class="item" class:expanded={expandedEdgeIndex === i}>
					<div class="item-header">
						<button
							class="item-expand"
							onclick={() => toggleEdge(i)}
							aria-expanded={expandedEdgeIndex === i}
							aria-label="Edit edge from {edge.from} to {edge.to}"
						>
							<span class="item-name edge-name"
								>{edge.from} → {edge.to}{edge.label ? ` (${edge.label})` : ''}</span
							>
							<span class="item-badge">{edge.type ?? 'network'}</span>
						</button>
						<button
							class="delete-btn"
							onclick={() => removeEdge(i)}
							aria-label="Delete edge from {edge.from} to {edge.to}"
							title="Delete edge"
						>
							✕
						</button>
					</div>

					{#if expandedEdgeIndex === i}
						<div class="item-body">
							<div class="field-row">
								<label class="field-label" for="edge-from-{i}">From</label>
								<select
									id="edge-from-{i}"
									class="field-select"
									value={edge.from}
									onchange={(e) =>
										updateEdgeField(
											i,
											'from',
											(e.currentTarget as HTMLSelectElement).value
										)}
									aria-label="Edge source node"
								>
									{#each spec.nodes as n (n.id)}
										<option value={n.id}>{n.label} ({n.id})</option>
									{/each}
								</select>
							</div>
							<div class="field-row">
								<label class="field-label" for="edge-to-{i}">To</label>
								<select
									id="edge-to-{i}"
									class="field-select"
									value={edge.to}
									onchange={(e) =>
										updateEdgeField(
											i,
											'to',
											(e.currentTarget as HTMLSelectElement).value
										)}
									aria-label="Edge target node"
								>
									{#each spec.nodes as n (n.id)}
										<option value={n.id}>{n.label} ({n.id})</option>
									{/each}
								</select>
							</div>
							<div class="field-row">
								<label class="field-label" for="edge-label-{i}">Label</label>
								<input
									id="edge-label-{i}"
									class="field-input"
									type="text"
									value={edge.label ?? ''}
									oninput={(e) =>
										updateEdgeField(
											i,
											'label',
											(e.currentTarget as HTMLInputElement).value
										)}
									aria-label="Edge label"
								/>
							</div>
							<div class="field-row">
								<label class="field-label" for="edge-type-{i}">Type</label>
								<select
									id="edge-type-{i}"
									class="field-select"
									value={edge.type ?? 'network'}
									onchange={(e) =>
										updateEdgeField(
											i,
											'type',
											(e.currentTarget as HTMLSelectElement).value
										)}
									aria-label="Edge type"
								>
									{#each EDGE_TYPES as et (et)}
										<option value={et}>{et}</option>
									{/each}
								</select>
							</div>
							<div class="field-row">
								<label class="field-label" for="edge-directed-{i}">Directed</label>
								<input
									id="edge-directed-{i}"
									class="field-checkbox"
									type="checkbox"
									checked={edge.directed ?? false}
									onchange={(e) =>
										updateEdgeField(
											i,
											'directed',
											(e.currentTarget as HTMLInputElement).checked
										)}
									aria-label="Edge directed"
								/>
							</div>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.ui-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
		background: #0d1117;
		color: #e6edf3;
		font-size: 12px;
	}

	.section {
		padding: 10px;
		border-bottom: 1px solid #21262d;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.section-title {
		margin: 0 0 8px 0;
		font-size: 11px;
		font-weight: 600;
		color: #8b949e;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.section-header .section-title {
		margin-bottom: 0;
	}

	.count {
		font-weight: 400;
		color: #6e7681;
	}

	.add-btn {
		padding: 3px 8px;
		border-radius: 5px;
		border: 1px solid #30363d;
		background: #161b22;
		color: #8b949e;
		cursor: pointer;
		font-size: 11px;
		white-space: nowrap;
		transition: background 0.15s, color 0.15s;
	}

	.add-btn:hover:not(:disabled) {
		background: #21262d;
		color: #e6edf3;
	}

	.add-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.empty-hint {
		margin: 4px 0;
		color: #6e7681;
		font-size: 11px;
		font-style: italic;
	}

	/* ── Field rows ─────────────────────────── */
	.field-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}

	.field-row--col {
		flex-direction: column;
		align-items: stretch;
	}

	.field-label {
		flex-shrink: 0;
		width: 68px;
		font-size: 11px;
		color: #8b949e;
	}

	.field-row--col .field-label {
		width: auto;
		margin-bottom: 2px;
	}

	.field-input {
		flex: 1;
		padding: 3px 6px;
		border-radius: 4px;
		border: 1px solid #30363d;
		background: #161b22;
		color: #e6edf3;
		font-size: 11px;
		outline: none;
		min-width: 0;
	}

	.field-input:focus {
		border-color: #4299e1;
	}

	.field-select {
		flex: 1;
		padding: 3px 6px;
		border-radius: 4px;
		border: 1px solid #30363d;
		background: #161b22;
		color: #e6edf3;
		font-size: 11px;
		outline: none;
		cursor: pointer;
		min-width: 0;
	}

	.field-select:focus {
		border-color: #4299e1;
	}

	.field-textarea {
		padding: 4px 6px;
		border-radius: 4px;
		border: 1px solid #30363d;
		background: #161b22;
		color: #e6edf3;
		font-size: 11px;
		outline: none;
		resize: vertical;
		font-family: inherit;
	}

	.field-textarea:focus {
		border-color: #4299e1;
	}

	.field-checkbox {
		accent-color: #4299e1;
		width: 14px;
		height: 14px;
		cursor: pointer;
	}

	/* ── Position inputs ───────────────────── */
	.pos-inputs {
		display: flex;
		align-items: center;
		gap: 4px;
		flex: 1;
	}

	.pos-label {
		font-size: 10px;
		color: #6e7681;
		flex-shrink: 0;
	}

	.pos-input {
		width: 56px;
		flex: none;
	}

	/* ── Item list ─────────────────────────── */
	.item-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.item {
		border-radius: 6px;
		border: 1px solid #21262d;
		overflow: hidden;
		background: #161b22;
		transition: border-color 0.15s;
	}

	.item.expanded {
		border-color: #4299e1;
	}

	.item-header {
		display: flex;
		align-items: center;
		background: none;
		border: none;
		color: #e6edf3;
		font-size: 11px;
	}

	.item-expand {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		padding: 6px 8px;
		background: none;
		border: none;
		color: #e6edf3;
		cursor: pointer;
		text-align: left;
		font-size: 11px;
		transition: background 0.1s;
		min-width: 0;
	}

	.item-expand:hover {
		background: #21262d;
	}

	.item-icon {
		flex-shrink: 0;
		font-size: 13px;
	}

	.item-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.edge-name {
		font-family: 'Fira Code', 'Cascadia Code', 'Menlo', monospace;
		font-size: 10px;
	}

	.item-badge {
		flex-shrink: 0;
		padding: 1px 5px;
		border-radius: 3px;
		background: #21262d;
		color: #8b949e;
		font-size: 10px;
	}

	.item-pos {
		flex-shrink: 0;
		font-size: 10px;
		color: #6e7681;
		font-family: 'Fira Code', 'Cascadia Code', 'Menlo', monospace;
	}

	.delete-btn {
		flex-shrink: 0;
		padding: 6px 8px;
		border-radius: 3px;
		border: 1px solid transparent;
		background: transparent;
		color: #6e7681;
		cursor: pointer;
		font-size: 10px;
		line-height: 1;
		transition: background 0.1s, color 0.1s, border-color 0.1s;
	}

	.delete-btn:hover {
		background: #7f1d1d;
		color: #fecaca;
		border-color: #ef4444;
	}

	.item-body {
		padding: 8px;
		border-top: 1px solid #21262d;
		background: #0d1117;
	}
</style>
