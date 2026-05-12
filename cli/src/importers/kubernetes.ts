import yaml from 'js-yaml';
import type { DiagramSpec, DiagramNode, DiagramEdge, DiagramGroup, NodeType } from '../types.js';
import { assignGroupedPositions } from '../layout.js';

/** Map Kubernetes resource kinds to diagram node types */
function k8sKindToNodeType(kind: string): NodeType {
	switch (kind.toLowerCase()) {
		case 'deployment':
		case 'replicaset':
		case 'daemonset':
		case 'job':
		case 'cronjob':
			return 'service';
		case 'statefulset':
			return 'database';
		case 'service':
			return 'loadbalancer';
		case 'ingress':
		case 'ingressroute':
			return 'gateway';
		case 'persistentvolumeclaim':
		case 'persistentvolume':
		case 'storageclass':
			return 'storage';
		case 'namespace':
			return 'cloud';
		case 'serviceaccount':
		case 'clusterrolebinding':
		case 'rolebinding':
			return 'person';
		case 'configmap':
		case 'secret':
		case 'horizontalpodautoscaler':
		case 'poddisruptionbudget':
			return 'generic';
		default:
			return 'generic';
	}
}

interface K8sResource {
	apiVersion?: string;
	kind?: string;
	metadata?: {
		name?: string;
		namespace?: string;
		labels?: Record<string, string>;
		annotations?: Record<string, string>;
	};
	spec?: Record<string, unknown>;
}

/** Sanitize a string for use as a node ID */
function sanitizeId(s: string): string {
	return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Build a unique node ID from namespace + name + kind */
function buildNodeId(resource: K8sResource): string {
	const ns = resource.metadata?.namespace ?? 'default';
	const name = resource.metadata?.name ?? 'unknown';
	const kind = resource.kind ?? 'resource';
	return sanitizeId(`${ns}_${kind}_${name}`);
}

/** Get the selector labels from a K8s Service spec */
function getServiceSelector(resource: K8sResource): Record<string, string> | undefined {
	const spec = resource.spec as { selector?: Record<string, string> } | undefined;
	return spec?.selector;
}

/** Get the pod template labels from a workload spec (Deployment, StatefulSet, etc.) */
function getPodLabels(resource: K8sResource): Record<string, string> | undefined {
	const spec = resource.spec as {
		selector?: { matchLabels?: Record<string, string> };
		template?: { metadata?: { labels?: Record<string, string> } };
	} | undefined;
	return spec?.template?.metadata?.labels ?? spec?.selector?.matchLabels;
}

/** Check if a selector matches a set of labels */
function selectorMatches(
	selector: Record<string, string>,
	labels: Record<string, string>
): boolean {
	return Object.entries(selector).every(([k, v]) => labels[k] === v);
}

/** Parse one or more Kubernetes YAML manifests into a DiagramSpec */
export function importKubernetes(source: string): DiagramSpec {
	const docs: unknown[] = [];

	// js-yaml loadAll for multi-document YAML
	yaml.loadAll(source, (doc) => {
		if (doc !== null && doc !== undefined) docs.push(doc);
	});

	if (docs.length === 0) {
		throw new Error('No valid Kubernetes resources found in the manifest.');
	}

	const resources: K8sResource[] = docs.filter(
		(d) => typeof d === 'object' && d !== null && 'kind' in (d as object)
	) as K8sResource[];

	if (resources.length === 0) {
		throw new Error('No Kubernetes resources with a "kind" field found.');
	}

	const nodes: DiagramNode[] = [];
	const nodeMap = new Map<string, K8sResource>(); // nodeId -> resource

	for (const resource of resources) {
		const nodeId = buildNodeId(resource);
		const kind = resource.kind ?? 'Resource';
		const name = resource.metadata?.name ?? 'unknown';
		const ns = resource.metadata?.namespace ?? 'default';

		nodes.push({
			id: nodeId,
			label: name,
			type: k8sKindToNodeType(kind),
			position: { x: 0, y: 0 },
			description: `${kind} in ${ns}`,
			meta: {
				kind,
				namespace: ns,
				...(resource.apiVersion ? { apiVersion: resource.apiVersion } : {})
			}
		});

		nodeMap.set(nodeId, resource);
	}

	// Build edges: Service -> Deployment/StatefulSet via label selector
	const edges: DiagramEdge[] = [];
	const edgeSet = new Set<string>();

	const services = resources.filter((r) => r.kind === 'Service');
	const workloads = resources.filter((r) =>
		['Deployment', 'StatefulSet', 'DaemonSet', 'ReplicaSet'].includes(r.kind ?? '')
	);
	const ingresses = resources.filter((r) => r.kind === 'Ingress' || r.kind === 'IngressRoute');

	for (const svc of services) {
		const selector = getServiceSelector(svc);
		if (!selector) continue;
		const svcId = buildNodeId(svc);

		for (const workload of workloads) {
			const podLabels = getPodLabels(workload);
			if (!podLabels) continue;
			if (selectorMatches(selector, podLabels)) {
				const workloadId = buildNodeId(workload);
				const key = `${svcId}->${workloadId}`;
				if (!edgeSet.has(key)) {
					edgeSet.add(key);
					edges.push({ from: svcId, to: workloadId, type: 'network', directed: true });
				}
			}
		}
	}

	// Ingress -> Service edges (from spec.rules[].http.paths[].backend)
	for (const ingress of ingresses) {
		const ingressId = buildNodeId(ingress);
		const rules = (ingress.spec as { rules?: unknown[] } | undefined)?.rules ?? [];
		for (const rule of rules) {
			if (typeof rule !== 'object' || rule === null) continue;
			const paths = (rule as { http?: { paths?: unknown[] } }).http?.paths ?? [];
			for (const path of paths) {
				if (typeof path !== 'object' || path === null) continue;
				// Both v1 and v1beta1 backend formats
				const backend = (path as Record<string, unknown>)['backend'] as Record<string, unknown> | undefined;
				if (!backend) continue;
				// v1: backend.service.name, v1beta1: backend.serviceName
				const svcName =
					(backend['service'] as Record<string, unknown> | undefined)?.['name'] as string | undefined ??
					(backend['serviceName'] as string | undefined);
				if (!svcName) continue;

				// Find matching service node
				for (const svc of services) {
					if (svc.metadata?.name === svcName) {
						const svcId = buildNodeId(svc);
						const key = `${ingressId}->${svcId}`;
						if (!edgeSet.has(key)) {
							edgeSet.add(key);
							edges.push({ from: ingressId, to: svcId, type: 'network', directed: true });
						}
					}
				}
			}
		}
	}

	// Group by namespace
	const groupMap = new Map<string, string[]>();
	const groupLabelMap = new Map<string, string>();

	for (const resource of resources) {
		const nodeId = buildNodeId(resource);
		const ns = resource.metadata?.namespace ?? 'default';
		const groupId = sanitizeId(ns);
		if (!groupMap.has(groupId)) groupMap.set(groupId, []);
		groupMap.get(groupId)!.push(nodeId);
		groupLabelMap.set(groupId, `Namespace: ${ns}`);
	}

	const groups: DiagramGroup[] = [];
	for (const [groupId, nodeIds] of groupMap) {
		if (nodeIds.length > 0) {
			groups.push({ id: groupId, label: groupLabelMap.get(groupId) ?? groupId, nodes: nodeIds });
		}
	}

	const positionedNodes = assignGroupedPositions(nodes, groupMap);

	// Derive a title from the first resource or namespace
	const firstNs = resources[0]?.metadata?.namespace ?? 'default';
	const title = `Kubernetes: ${firstNs}`;

	return {
		title,
		type: 'networking',
		description: `Imported from Kubernetes manifests (${resources.length} resource${resources.length !== 1 ? 's' : ''})`,
		settings: { theme: 'dark', showGrid: true, padding: 2 },
		nodes: positionedNodes,
		edges: edges.length > 0 ? edges : undefined,
		groups: groups.length > 0 ? groups : undefined
	};
}
