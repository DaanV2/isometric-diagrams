<script lang="ts">
	import type {
		DiagramSpec,
		DiagramNode,
		DiagramEdge,
		DiagramGroup,
		NodeType,
		EdgeType,
		DiagramType
	} from '$lib/types/diagram.js';

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
	const THEMES = ['dark', 'light'] as const;

	interface Props {
		spec: DiagramSpec;
		onchange: (spec: DiagramSpec) => void;
	}

	let { spec, onchange }: Props = $props();

	// Local mutable state – initialised once from the spec prop.
	// The parent uses {#key uiEditorKey} to reset this component when needed.
	let title = $state(spec.title ?? '');
	let type = $state<DiagramType>(spec.type ?? 'generic');
	let description = $state(spec.description ?? '');
	let theme = $state<'light' | 'dark'>(spec.settings?.theme ?? 'dark');
	let tileSize = $state(spec.settings?.tileSize ?? 64);
	let showGrid = $state(spec.settings?.showGrid ?? true);
	let padding = $state(spec.settings?.padding ?? 2);
	let nodes = $state<DiagramNode[]>(structuredClone(spec.nodes ?? []));
	let edges = $state<DiagramEdge[]>(structuredClone(spec.edges ?? []));
	let groups = $state<DiagramGroup[]>(structuredClone(spec.groups ?? []));

	// Drag state for node reordering
	let dragIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	function emit() {
		onchange({
			title,
			type,
			...(description ? { description } : {}),
			settings: { theme, tileSize, showGrid, padding },
			nodes: structuredClone(nodes),
			edges: structuredClone(edges),
			groups: structuredClone(groups)
		});
	}

	// ── Nodes ──────────────────────────────────────────────────────
	function addNode() {
		nodes.push({
			id: `node-${nodes.length + 1}`,
			label: 'New Node',
			type: 'generic',
			position: { x: 0, y: nodes.length }
		});
		emit();
	}

	function removeNode(i: number) {
		nodes.splice(i, 1);
		emit();
	}

	function onNodeDragStart(i: number, e: DragEvent) {
		dragIndex = i;
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}

	function onNodeDragOver(i: number, e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverIndex = i;
	}

	function onNodeDrop(i: number, e: DragEvent) {
		e.preventDefault();
		if (dragIndex === null || dragIndex === i) {
			dragIndex = null;
			dragOverIndex = null;
			return;
		}
		const [moved] = nodes.splice(dragIndex, 1);
		nodes.splice(i, 0, moved);
		dragIndex = null;
		dragOverIndex = null;
		emit();
	}

	function onNodeDragEnd() {
		dragIndex = null;
		dragOverIndex = null;
	}

	// ── Edges ──────────────────────────────────────────────────────
	function addEdge() {
		edges.push({
			from: nodes[0]?.id ?? '',
			to: nodes[1]?.id ?? nodes[0]?.id ?? '',
			type: 'network',
			directed: true
		});
		emit();
	}

	function removeEdge(i: number) {
		edges.splice(i, 1);
		emit();
	}

	// ── Groups ─────────────────────────────────────────────────────
	function addGroup() {
		groups.push({ id: `group-${groups.length + 1}`, label: 'New Group', nodes: [] });
		emit();
	}

	function removeGroup(i: number) {
		groups.splice(i, 1);
		emit();
	}
</script>

<div class="ui-editor" role="form" aria-label="Visual diagram editor">
	<!-- Diagram Info -->
	<section class="ui-section">
		<h3 class="section-title">Diagram</h3>
		<label class="field">
			<span class="field-label">Title</span>
			<input
				type="text"
				bind:value={title}
				oninput={emit}
				aria-label="Diagram title"
				class="field-input"
			/>
		</label>
		<label class="field">
			<span class="field-label">Type</span>
			<select
				bind:value={type}
				onchange={emit}
				class="field-select"
				aria-label="Diagram type"
			>
				{#each DIAGRAM_TYPES as t (t)}
					<option value={t}>{t}</option>
				{/each}
			</select>
		</label>
		<label class="field">
			<span class="field-label">Description</span>
			<input
				type="text"
				bind:value={description}
				oninput={emit}
				aria-label="Diagram description"
				class="field-input"
			/>
		</label>
	</section>

	<!-- Settings -->
	<section class="ui-section">
		<h3 class="section-title">Settings</h3>
		<label class="field">
			<span class="field-label">Theme</span>
			<select bind:value={theme} onchange={emit} class="field-select" aria-label="Theme">
				{#each THEMES as t (t)}
					<option value={t}>{t}</option>
				{/each}
			</select>
		</label>
		<label class="field">
			<span class="field-label">Tile size</span>
			<input
				type="number"
				bind:value={tileSize}
				oninput={emit}
				min="32"
				max="128"
				step="8"
				class="field-input"
				aria-label="Tile size"
			/>
		</label>
		<label class="field field-row">
			<span class="field-label">Show grid</span>
			<input type="checkbox" bind:checked={showGrid} onchange={emit} aria-label="Show grid" />
		</label>
		<label class="field">
			<span class="field-label">Padding</span>
			<input
				type="number"
				bind:value={padding}
				oninput={emit}
				min="0"
				max="10"
				step="1"
				class="field-input"
				aria-label="Padding"
			/>
		</label>
	</section>

	<!-- Nodes -->
	<section class="ui-section">
		<div class="section-header">
			<h3 class="section-title">Nodes ({nodes.length})</h3>
			<button class="add-btn" onclick={addNode} aria-label="Add node">+ Add</button>
		</div>
		<ul class="item-list" aria-label="Nodes list">
			{#each nodes as node, i (node.id + '-' + i)}
				<li
					class="item"
					class:drag-over={dragOverIndex === i}
					draggable="true"
					ondragstart={(e) => onNodeDragStart(i, e)}
					ondragover={(e) => onNodeDragOver(i, e)}
					ondrop={(e) => onNodeDrop(i, e)}
					ondragend={onNodeDragEnd}
					aria-label={`Node ${i + 1}: ${node.label}`}
				>
					<span class="drag-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
					<div class="item-fields">
						<div class="node-row">
							<input
								type="text"
								value={node.label}
								oninput={(e) => {
									node.label = (e.target as HTMLInputElement).value;
									emit();
								}}
								placeholder="label"
								class="item-input"
								aria-label={`Node ${i + 1} label`}
							/>
							<select
								bind:value={node.type}
								onchange={emit}
								class="item-select"
								aria-label={`Node ${i + 1} type`}
							>
								{#each NODE_TYPES as t (t)}
									<option value={t}>{t}</option>
								{/each}
							</select>
						</div>
						<div class="pos-row">
							<label class="pos-label">
								x
								<input
									type="number"
									value={node.position.x}
									oninput={(e) => {
										node.position.x = Number((e.target as HTMLInputElement).value);
										emit();
									}}
									class="pos-input"
									aria-label={`Node ${i + 1} x position`}
								/>
							</label>
							<label class="pos-label">
								y
								<input
									type="number"
									value={node.position.y}
									oninput={(e) => {
										node.position.y = Number((e.target as HTMLInputElement).value);
										emit();
									}}
									class="pos-input"
									aria-label={`Node ${i + 1} y position`}
								/>
							</label>
						</div>
					</div>
					<button
						class="remove-btn"
						onclick={() => removeNode(i)}
						aria-label={`Remove node ${node.label}`}
					>×</button>
				</li>
			{/each}
		</ul>
	</section>

	<!-- Edges -->
	<section class="ui-section">
		<div class="section-header">
			<h3 class="section-title">Edges ({edges.length})</h3>
			<button class="add-btn" onclick={addEdge} aria-label="Add edge">+ Add</button>
		</div>
		<ul class="item-list" aria-label="Edges list">
			{#each edges as edge, i}
				<li class="item" aria-label={`Edge ${i + 1}: ${edge.from} to ${edge.to}`}>
					<div class="item-fields">
						<div class="edge-row">
							<select
								bind:value={edge.from}
								onchange={emit}
								class="item-select"
								aria-label={`Edge ${i + 1} from`}
							>
								{#each nodes as n (n.id)}
									<option value={n.id}>{n.id}</option>
								{/each}
							</select>
							<span class="arrow" aria-hidden="true">→</span>
							<select
								bind:value={edge.to}
								onchange={emit}
								class="item-select"
								aria-label={`Edge ${i + 1} to`}
							>
								{#each nodes as n (n.id)}
									<option value={n.id}>{n.id}</option>
								{/each}
							</select>
						</div>
						<div class="edge-meta">
							<input
								type="text"
								value={edge.label ?? ''}
								oninput={(e) => {
									edge.label = (e.target as HTMLInputElement).value || undefined;
									emit();
								}}
								placeholder="label (optional)"
								class="item-input"
								aria-label={`Edge ${i + 1} label`}
							/>
							<select
								bind:value={edge.type}
								onchange={emit}
								class="item-select"
								aria-label={`Edge ${i + 1} type`}
							>
								{#each EDGE_TYPES as t (t)}
									<option value={t}>{t}</option>
								{/each}
							</select>
							<label class="inline-check">
								<input
									type="checkbox"
									checked={!!edge.directed}
									onchange={(e) => {
										edge.directed = (e.target as HTMLInputElement).checked;
										emit();
									}}
									aria-label={`Edge ${i + 1} directed`}
								/>
								directed
							</label>
						</div>
					</div>
					<button
						class="remove-btn"
						onclick={() => removeEdge(i)}
						aria-label={`Remove edge ${i + 1}`}
					>×</button>
				</li>
			{/each}
		</ul>
	</section>

	<!-- Groups -->
	<section class="ui-section">
		<div class="section-header">
			<h3 class="section-title">Groups ({groups.length})</h3>
			<button class="add-btn" onclick={addGroup} aria-label="Add group">+ Add</button>
		</div>
		<ul class="item-list" aria-label="Groups list">
			{#each groups as group, i}
				<li class="item" aria-label={`Group ${i + 1}: ${group.label}`}>
					<div class="item-fields">
						<input
							type="text"
							bind:value={group.id}
							oninput={emit}
							placeholder="id"
							class="item-input item-id"
							aria-label={`Group ${i + 1} ID`}
						/>
						<input
							type="text"
							bind:value={group.label}
							oninput={emit}
							placeholder="label"
							class="item-input"
							aria-label={`Group ${i + 1} label`}
						/>
						<input
							type="text"
							value={group.nodes.join(', ')}
							oninput={(e) => {
								group.nodes = (e.target as HTMLInputElement).value
									.split(',')
									.map((s) => s.trim())
									.filter(Boolean);
								emit();
							}}
							placeholder="node ids (comma-separated)"
							class="item-input"
							aria-label={`Group ${i + 1} nodes`}
						/>
					</div>
					<button
						class="remove-btn"
						onclick={() => removeGroup(i)}
						aria-label={`Remove group ${group.label}`}
					>×</button>
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.ui-editor {
		flex: 1;
		overflow-y: auto;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ui-section {
		border-bottom: 1px solid #21262d;
		padding-bottom: 8px;
		margin-bottom: 2px;
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.section-title {
		font-size: 10px;
		font-weight: 600;
		color: #8b949e;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin: 6px 0 4px;
	}

	.add-btn {
		padding: 2px 8px;
		border-radius: 4px;
		border: 1px solid #30363d;
		background: transparent;
		color: #4299e1;
		cursor: pointer;
		font-size: 11px;
	}
	.add-btn:hover {
		background: #21262d;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin-bottom: 4px;
	}

	.field-row {
		flex-direction: row;
		align-items: center;
		gap: 8px;
	}

	.field-label {
		font-size: 10px;
		color: #8b949e;
	}

	.field-input,
	.field-select {
		background: #0d1117;
		border: 1px solid #30363d;
		border-radius: 4px;
		color: #e6edf3;
		font-size: 11px;
		padding: 3px 6px;
		width: 100%;
	}
	.field-input:focus,
	.field-select:focus {
		outline: 1px solid #4299e1;
	}

	.item-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.item {
		display: flex;
		gap: 4px;
		background: #0d1117;
		border: 1px solid #21262d;
		border-radius: 4px;
		padding: 4px;
		align-items: flex-start;
	}

	.item.drag-over {
		border-color: #4299e1;
		background: #0d1b2a;
	}

	.drag-handle {
		cursor: grab;
		color: #4b5263;
		font-size: 14px;
		padding: 2px;
		flex-shrink: 0;
		user-select: none;
		line-height: 1.4;
	}
	.drag-handle:active {
		cursor: grabbing;
	}

	.item-fields {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.item-input,
	.item-select {
		background: #161b22;
		border: 1px solid #30363d;
		border-radius: 3px;
		color: #e6edf3;
		font-size: 11px;
		padding: 2px 5px;
		width: 100%;
		min-width: 0;
	}
	.item-input:focus,
	.item-select:focus {
		outline: 1px solid #4299e1;
	}

	.item-id {
		color: #90cdf4;
		font-family: monospace;
	}

	.node-row {
		display: flex;
		gap: 4px;
	}

	.pos-row {
		display: flex;
		gap: 6px;
	}

	.pos-label {
		display: flex;
		align-items: center;
		gap: 3px;
		font-size: 10px;
		color: #8b949e;
		flex: 1;
	}

	.pos-input {
		background: #161b22;
		border: 1px solid #30363d;
		border-radius: 3px;
		color: #e6edf3;
		font-size: 11px;
		padding: 2px 4px;
		width: 100%;
		min-width: 0;
	}
	.pos-input:focus {
		outline: 1px solid #4299e1;
	}

	.remove-btn {
		background: transparent;
		border: none;
		color: #6b2020;
		cursor: pointer;
		font-size: 16px;
		padding: 0 2px;
		flex-shrink: 0;
		line-height: 1;
	}
	.remove-btn:hover {
		color: #f87171;
	}

	.edge-row {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.arrow {
		color: #8b949e;
		font-size: 12px;
		flex-shrink: 0;
	}

	.edge-meta {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.inline-check {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 10px;
		color: #8b949e;
		cursor: pointer;
	}
</style>
