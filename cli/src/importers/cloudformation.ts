import yaml from 'js-yaml';
import type { DiagramSpec, DiagramNode, DiagramEdge, DiagramGroup, NodeType, EdgeType } from '../types.js';
import { assignGroupedPositions } from '../layout.js';

/** Map CloudFormation resource types to diagram node types */
function cfnTypeToNodeType(cfnType: string): NodeType {
	const t = cfnType.toLowerCase();
	if (t.includes('loadbalancer') || t.includes('alb') || t.includes('elb')) return 'loadbalancer';
	if (t.includes('lambda')) return 'service';
	if (t.includes('ecs::service') || t.includes('ecs::taskdefinition')) return 'service';
	if (t.includes('elasticbeanstalk')) return 'service';
	if (t.includes('rds') || t.includes('dynamodb') || t.includes('elasticache') || t.includes('docdb') || t.includes('neptune') || t.includes('redshift')) return 'database';
	if (t.includes('sqs') || t.includes('sns') || t.includes('kinesis') || t.includes('msk')) return 'queue';
	if (t.includes('s3') || t.includes('efs') || t.includes('fsx') || t.includes('glacier')) return 'storage';
	if (t.includes('apigateway') || t.includes('appsync')) return 'gateway';
	if (t.includes('cloudfront') || t.includes('vpc') || t.includes('ec2::vpc')) return 'cloud';
	if (t.includes('natgateway') || t.includes('internetgateway') || t.includes('ec2::routetable')) return 'router';
	if (t.includes('ec2::instance')) return 'server';
	if (t.includes('iam') || t.includes('cognito')) return 'person';
	return 'generic';
}

/** Recursively collect all string values that look like CloudFormation logical IDs from Ref/GetAtt */
function extractRefs(value: unknown, knownIds: Set<string>): string[] {
	if (typeof value !== 'object' || value === null) return [];
	const obj = value as Record<string, unknown>;

	const refs: string[] = [];

	if ('Ref' in obj && typeof obj['Ref'] === 'string' && knownIds.has(obj['Ref'])) {
		refs.push(obj['Ref']);
	}
	if ('Fn::GetAtt' in obj && Array.isArray(obj['Fn::GetAtt'])) {
		const att = obj['Fn::GetAtt'] as unknown[];
		if (typeof att[0] === 'string' && knownIds.has(att[0])) {
			refs.push(att[0]);
		}
	}

	for (const v of Object.values(obj)) {
		refs.push(...extractRefs(v, knownIds));
	}

	return refs;
}

/** Extract a human-readable label from a CloudFormation resource */
function resourceLabel(logicalId: string, resource: Record<string, unknown>): string {
	const props = resource['Properties'] as Record<string, unknown> | undefined;
	if (props) {
		// Common name properties
		for (const key of ['FunctionName', 'TableName', 'BucketName', 'QueueName', 'TopicName', 'DBInstanceIdentifier', 'ClusterIdentifier', 'Name', 'LoadBalancerName']) {
			const v = props[key];
			if (typeof v === 'string') return v;
		}
	}
	return logicalId;
}

/** Parse a CloudFormation template (YAML or JSON) into a DiagramSpec */
export function importCloudFormation(source: string): DiagramSpec {
	let raw: unknown;
	try {
		raw = yaml.load(source);
	} catch {
		raw = JSON.parse(source);
	}

	if (typeof raw !== 'object' || raw === null) {
		throw new Error('CloudFormation template must be a YAML/JSON object.');
	}

	const template = raw as Record<string, unknown>;
	const resources = template['Resources'] as Record<string, unknown> | undefined;

	if (!resources || typeof resources !== 'object') {
		throw new Error('CloudFormation template must contain a "Resources" section.');
	}

	const description = typeof template['Description'] === 'string' ? template['Description'] : undefined;

	// Build nodes
	const nodes: DiagramNode[] = [];
	const knownIds = new Set(Object.keys(resources));

	for (const [logicalId, resource] of Object.entries(resources)) {
		if (typeof resource !== 'object' || resource === null) continue;
		const res = resource as Record<string, unknown>;
		const cfnType = typeof res['Type'] === 'string' ? res['Type'] : 'Unknown';
		const nodeType = cfnTypeToNodeType(cfnType);
		const label = resourceLabel(logicalId, res);

		nodes.push({
			id: logicalId,
			label,
			type: nodeType,
			position: { x: 0, y: 0 }, // assigned later
			description: cfnType,
			meta: { cfnType }
		});
	}

	// Build edges from DependsOn + Ref/GetAtt references in properties
	const edges: DiagramEdge[] = [];
	const edgeSet = new Set<string>();

	function addEdge(from: string, to: string, type: EdgeType = 'dependency') {
		if (from === to) return;
		const key = `${from}->${to}`;
		if (edgeSet.has(key)) return;
		edgeSet.add(key);
		edges.push({ from, to, type, directed: true });
	}

	for (const [logicalId, resource] of Object.entries(resources)) {
		if (typeof resource !== 'object' || resource === null) continue;
		const res = resource as Record<string, unknown>;

		// DependsOn
		const dependsOn = res['DependsOn'];
		if (typeof dependsOn === 'string') {
			addEdge(logicalId, dependsOn, 'dependency');
		} else if (Array.isArray(dependsOn)) {
			for (const dep of dependsOn) {
				if (typeof dep === 'string') addEdge(logicalId, dep, 'dependency');
			}
		}

		// Ref / Fn::GetAtt in Properties
		const refs = extractRefs(res['Properties'], knownIds);
		for (const ref of refs) {
			addEdge(logicalId, ref, 'dependency');
		}
	}

	// Group by service prefix (e.g. AWS::EC2 -> EC2 group)
	const groupMap = new Map<string, string[]>();
	for (const [logicalId, resource] of Object.entries(resources)) {
		if (typeof resource !== 'object' || resource === null) continue;
		const res = resource as Record<string, unknown>;
		const cfnType = typeof res['Type'] === 'string' ? res['Type'] : 'Unknown';
		const parts = cfnType.split('::');
		const groupId = parts.length >= 2 ? `${parts[0]}_${parts[1]}`.toLowerCase() : 'other';
		const groupLabel = parts.length >= 2 ? `${parts[1]}` : 'Other';

		if (!groupMap.has(groupId)) {
			groupMap.set(groupId, []);
		}
		groupMap.get(groupId)!.push(logicalId);

		// Only create groups for groupId (labels stored separately below)
		void groupLabel;
	}

	// Build group label map
	const groupLabelMap = new Map<string, string>();
	for (const [logicalId, resource] of Object.entries(resources)) {
		if (typeof resource !== 'object' || resource === null) continue;
		const res = resource as Record<string, unknown>;
		const cfnType = typeof res['Type'] === 'string' ? res['Type'] : 'Unknown';
		const parts = cfnType.split('::');
		const groupId = parts.length >= 2 ? `${parts[0]}_${parts[1]}`.toLowerCase() : 'other';
		const groupLabel = parts.length >= 2 ? `${parts[1]}` : 'Other';
		groupLabelMap.set(groupId, groupLabel);
	}

	const groups: DiagramGroup[] = [];
	for (const [groupId, nodeIds] of groupMap) {
		if (nodeIds.length > 0) {
			groups.push({
				id: groupId,
				label: groupLabelMap.get(groupId) ?? groupId,
				nodes: nodeIds
			});
		}
	}

	// Assign grid positions grouped by service
	const positionedNodes = assignGroupedPositions(nodes, groupMap);

	return {
		title: (template['AWSTemplateFormatVersion'] ? 'CloudFormation Diagram' : 'Infrastructure Diagram'),
		type: 'networking',
		description,
		settings: { theme: 'dark', showGrid: true, padding: 2 },
		nodes: positionedNodes,
		edges: edges.length > 0 ? edges : undefined,
		groups: groups.length > 0 ? groups : undefined
	};
}
