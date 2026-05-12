import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { importKubernetes } from '../src/importers/kubernetes.js';

const SIMPLE_K8S = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: production
  labels:
    app: frontend
spec:
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: nginx
          image: nginx:latest
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
  namespace: production
spec:
  selector:
    app: frontend
  ports:
    - port: 80
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: main-ingress
  namespace: production
spec:
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-svc
                port:
                  number: 80
`;

const MULTI_NS_K8S = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: backend
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: frontend
`;

describe('Kubernetes importer', () => {
  it('parses multi-document YAML and returns a DiagramSpec', () => {
    const spec = importKubernetes(SIMPLE_K8S);
    assert.ok(spec.title.includes('Kubernetes'));
    assert.equal(spec.type, 'networking');
    assert.ok(Array.isArray(spec.nodes));
    assert.equal(spec.nodes.length, 4);
  });

  it('maps Deployment to service node type', () => {
    const spec = importKubernetes(SIMPLE_K8S);
    const node = spec.nodes.find((n) => n.label === 'frontend');
    assert.ok(node, 'frontend deployment node should exist');
    assert.equal(node?.type, 'service');
  });

  it('maps Service to loadbalancer node type', () => {
    const spec = importKubernetes(SIMPLE_K8S);
    const node = spec.nodes.find((n) => n.label === 'frontend-svc');
    assert.ok(node, 'frontend-svc service node should exist');
    assert.equal(node?.type, 'loadbalancer');
  });

  it('maps StatefulSet to database node type', () => {
    const spec = importKubernetes(SIMPLE_K8S);
    const node = spec.nodes.find((n) => n.label === 'postgres');
    assert.ok(node, 'postgres statefulset node should exist');
    assert.equal(node?.type, 'database');
  });

  it('maps Ingress to gateway node type', () => {
    const spec = importKubernetes(SIMPLE_K8S);
    const node = spec.nodes.find((n) => n.label === 'main-ingress');
    assert.ok(node, 'main-ingress node should exist');
    assert.equal(node?.type, 'gateway');
  });

  it('creates Service->Deployment edge via label selector', () => {
    const spec = importKubernetes(SIMPLE_K8S);
    assert.ok(Array.isArray(spec.edges));
    // Service frontend-svc -> Deployment frontend
    const svcNode = spec.nodes.find((n) => n.label === 'frontend-svc')!;
    const depNode = spec.nodes.find((n) => n.label === 'frontend')!;
    assert.ok(svcNode && depNode);
    const edge = spec.edges!.find((e) => e.from === svcNode.id && e.to === depNode.id);
    assert.ok(edge, 'edge from Service to Deployment should exist');
  });

  it('creates Ingress->Service edge', () => {
    const spec = importKubernetes(SIMPLE_K8S);
    const ingressNode = spec.nodes.find((n) => n.label === 'main-ingress')!;
    const svcNode = spec.nodes.find((n) => n.label === 'frontend-svc')!;
    assert.ok(ingressNode && svcNode);
    const edge = spec.edges!.find((e) => e.from === ingressNode.id && e.to === svcNode.id);
    assert.ok(edge, 'edge from Ingress to Service should exist');
  });

  it('groups resources by namespace', () => {
    const spec = importKubernetes(SIMPLE_K8S);
    assert.ok(Array.isArray(spec.groups));
    const prodGroup = spec.groups!.find((g) => g.label.includes('production'));
    assert.ok(prodGroup, 'production namespace group should exist');
    assert.equal(prodGroup?.nodes.length, 4);
  });

  it('groups multiple namespaces separately', () => {
    const spec = importKubernetes(MULTI_NS_K8S);
    assert.equal(spec.nodes.length, 2);
    assert.equal(spec.groups?.length, 2);
  });

  it('assigns grid positions to all nodes', () => {
    const spec = importKubernetes(SIMPLE_K8S);
    for (const node of spec.nodes) {
      assert.ok(typeof node.position.x === 'number');
      assert.ok(typeof node.position.y === 'number');
    }
  });

  it('stores kind and namespace in node meta', () => {
    const spec = importKubernetes(SIMPLE_K8S);
    const node = spec.nodes.find((n) => n.label === 'frontend')!;
    assert.equal(node?.meta?.kind, 'Deployment');
    assert.equal(node?.meta?.namespace, 'production');
  });

  it('throws on empty/invalid manifest', () => {
    assert.throws(() => importKubernetes(''), /No valid Kubernetes resources/);
  });

  it('throws when no resources have a kind field', () => {
    assert.throws(() => importKubernetes('foo: bar\nbaz: qux\n'), /No Kubernetes resources/);
  });
});
