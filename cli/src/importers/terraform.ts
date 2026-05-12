import type { DiagramSpec, DiagramNode, DiagramEdge, DiagramGroup, NodeType } from '../types.js';
import { assignGroupedPositions } from '../layout.js';

/** Map Terraform resource type prefixes to diagram node types */
function tfTypeToNodeType(tfType: string): NodeType {
	const t = tfType.toLowerCase();
	if (t.includes('lb') || t.includes('alb') || t.includes('elb') || t === 'aws_load_balancer') return 'loadbalancer';
	if (t.includes('lambda') || t.includes('function') || t.includes('ecs_service') || t.includes('app_service') || t.includes('container_group')) return 'service';
	if (t.includes('db_instance') || t.includes('rds') || t.includes('dynamodb') || t.includes('elasticache') || t.includes('cosmosdb') || t.includes('sql') || t.includes('mongo') || t.includes('redis') || t.includes('aurora') || t.includes('mysql') || t.includes('postgres')) return 'database';
	if (t.includes('sqs') || t.includes('sns') || t.includes('queue') || t.includes('topic') || t.includes('kinesis') || t.includes('servicebus') || t.includes('pubsub') || t.includes('eventhub')) return 'queue';
	if (t.includes('s3_bucket') || t.includes('storage') || t.includes('blob') || t.includes('efs') || t.includes('disk') || t.includes('bucket')) return 'storage';
	if (t.includes('api_gateway') || t.includes('apigateway') || t.includes('apigw') || t.includes('apim')) return 'gateway';
	if (t.includes('cloudfront') || t.includes('vpc') || t.includes('vnet') || t.includes('network') || t.includes('resource_group')) return 'cloud';
	if (t.includes('nat') || t.includes('internet_gateway') || t.includes('route_table') || t.includes('router')) return 'router';
	if (t.includes('instance') || t.includes('vm') || t.includes('compute') || t.includes('droplet')) return 'server';
	if (t.includes('iam') || t.includes('user') || t.includes('role')) return 'person';
	return 'generic';
}

/** Derive a service/provider prefix from a Terraform resource type for grouping */
function tfTypeToGroup(tfType: string): { id: string; label: string } {
	const parts = tfType.split('_');
	// e.g. aws_instance -> aws, google_sql_database_instance -> google
	const provider = parts[0] ?? 'other';
	// Second segment gives a coarser grouping (aws_ec2 from aws_ec2_instance, etc.)
	const service = parts[1] ?? 'resource';
	return {
		id: `${provider}_${service}`,
		label: `${provider.toUpperCase()} ${service.charAt(0).toUpperCase() + service.slice(1)}`
	};
}

/** Terraform state file schema (simplified) */
interface TfState {
	version?: number;
	resources?: TfStateResource[];
}

interface TfStateResource {
	type: string;
	name: string;
	module?: string;
	provider?: string;
	instances?: TfStateInstance[];
	dependencies?: string[];
}

interface TfStateInstance {
	attributes?: Record<string, unknown>;
	dependencies?: string[];
}

/** Extract a human-readable label from a Terraform resource instance attributes */
function tfResourceLabel(resource: TfStateResource): string {
	const attrs = resource.instances?.[0]?.attributes ?? {};
	for (const key of ['name', 'function_name', 'table_name', 'bucket', 'queue_url', 'dns_name', 'id']) {
		const v = attrs[key];
		if (typeof v === 'string' && v.length > 0 && v.length < 64) return v;
	}
	return `${resource.type}.${resource.name}`;
}

/** Parse a Terraform state file (JSON) into a DiagramSpec */
export function importTerraform(source: string): DiagramSpec {
	let raw: unknown;
	try {
		raw = JSON.parse(source);
	} catch {
		throw new Error('Terraform state file must be valid JSON.');
	}

	if (typeof raw !== 'object' || raw === null) {
		throw new Error('Terraform state file must be a JSON object.');
	}

	const state = raw as TfState;

	if (!Array.isArray(state.resources)) {
		throw new Error('Terraform state must contain a "resources" array.');
	}

	// Filter out data sources (type starts with "data") – optional
	const resources = state.resources.filter((r) => r.type && r.name);

	const nodes: DiagramNode[] = [];
	const idMap = new Map<string, string>(); // "type.name" -> sanitized node id

	for (const resource of resources) {
		const rawId = `${resource.type}.${resource.name}`;
		const nodeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_');
		idMap.set(rawId, nodeId);

		nodes.push({
			id: nodeId,
			label: tfResourceLabel(resource),
			type: tfTypeToNodeType(resource.type),
			position: { x: 0, y: 0 },
			description: resource.type,
			meta: {
				tfType: resource.type,
				tfName: resource.name,
				...(resource.module ? { module: resource.module } : {})
			}
		});
	}

	// Build edges from dependencies
	const edges: DiagramEdge[] = [];
	const edgeSet = new Set<string>();

	for (const resource of resources) {
		const fromId = idMap.get(`${resource.type}.${resource.name}`);
		if (!fromId) continue;

		// Resource-level dependencies
		const deps = [
			...(resource.dependencies ?? []),
			...(resource.instances?.flatMap((inst) => inst.dependencies ?? []) ?? [])
		];

		for (const dep of deps) {
			// dep is like "aws_instance.web" or "module.vpc.aws_subnet.public"
			const normalized = dep.split('.').slice(-2).join('.');
			const toId = idMap.get(normalized) ?? idMap.get(dep);
			if (!toId || toId === fromId) continue;
			const key = `${fromId}->${toId}`;
			if (edgeSet.has(key)) continue;
			edgeSet.add(key);
			edges.push({ from: fromId, to: toId, type: 'dependency', directed: true });
		}
	}

	// Group by provider/service
	const groupMap = new Map<string, string[]>();
	const groupLabelMap = new Map<string, string>();

	for (const resource of resources) {
		const nodeId = idMap.get(`${resource.type}.${resource.name}`)!;
		const { id: groupId, label: groupLabel } = tfTypeToGroup(resource.type);
		if (!groupMap.has(groupId)) groupMap.set(groupId, []);
		groupMap.get(groupId)!.push(nodeId);
		groupLabelMap.set(groupId, groupLabel);
	}

	const groups: DiagramGroup[] = [];
	for (const [groupId, nodeIds] of groupMap) {
		if (nodeIds.length > 0) {
			groups.push({ id: groupId, label: groupLabelMap.get(groupId) ?? groupId, nodes: nodeIds });
		}
	}

	const positionedNodes = assignGroupedPositions(nodes, groupMap);

	return {
		title: 'Terraform Infrastructure',
		type: 'networking',
		description: `Imported from Terraform state (v${state.version ?? '?'})`,
		settings: { theme: 'dark', showGrid: true, padding: 2 },
		nodes: positionedNodes,
		edges: edges.length > 0 ? edges : undefined,
		groups: groups.length > 0 ? groups : undefined
	};
}
