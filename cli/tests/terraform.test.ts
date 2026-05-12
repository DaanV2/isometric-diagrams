import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { importTerraform } from '../src/importers/terraform.js';

const SIMPLE_TFSTATE = JSON.stringify({
  version: 4,
  terraform_version: '1.5.0',
  resources: [
    {
      type: 'aws_instance',
      name: 'web',
      instances: [
        {
          attributes: { id: 'i-1234', name: 'web-server' },
          dependencies: ['aws_security_group.web_sg']
        }
      ]
    },
    {
      type: 'aws_security_group',
      name: 'web_sg',
      instances: [{ attributes: { id: 'sg-5678', name: 'web-sg' } }]
    },
    {
      type: 'aws_db_instance',
      name: 'primary',
      instances: [
        {
          attributes: { id: 'db-9999', db_instance_identifier: 'mydb' },
          dependencies: []
        }
      ]
    },
    {
      type: 'aws_s3_bucket',
      name: 'assets',
      instances: [{ attributes: { bucket: 'my-assets-bucket' } }]
    },
    {
      type: 'aws_sqs_queue',
      name: 'tasks',
      instances: [{ attributes: { name: 'task-queue' } }]
    }
  ]
});

describe('Terraform importer', () => {
  it('parses a state file and returns a DiagramSpec', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    assert.equal(spec.title, 'Terraform Infrastructure');
    assert.equal(spec.type, 'networking');
    assert.ok(Array.isArray(spec.nodes));
    assert.equal(spec.nodes.length, 5);
  });

  it('maps aws_instance to server', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    const node = spec.nodes.find((n) => n.id === 'aws_instance_web');
    assert.ok(node, 'aws_instance.web node should exist');
    assert.equal(node?.type, 'server');
  });

  it('maps aws_db_instance to database', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    const node = spec.nodes.find((n) => n.id === 'aws_db_instance_primary');
    assert.ok(node, 'aws_db_instance.primary node should exist');
    assert.equal(node?.type, 'database');
  });

  it('maps aws_s3_bucket to storage', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    const node = spec.nodes.find((n) => n.id === 'aws_s3_bucket_assets');
    assert.ok(node, 'aws_s3_bucket.assets node should exist');
    assert.equal(node?.type, 'storage');
  });

  it('maps aws_sqs_queue to queue', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    const node = spec.nodes.find((n) => n.id === 'aws_sqs_queue_tasks');
    assert.ok(node, 'aws_sqs_queue.tasks node should exist');
    assert.equal(node?.type, 'queue');
  });

  it('extracts dependencies as edges', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    assert.ok(Array.isArray(spec.edges));
    const edge = spec.edges!.find(
      (e) => e.from === 'aws_instance_web' && e.to === 'aws_security_group_web_sg'
    );
    assert.ok(edge, 'edge aws_instance.web -> aws_security_group.web_sg should exist');
  });

  it('assigns grid positions to all nodes', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    for (const node of spec.nodes) {
      assert.ok(typeof node.position.x === 'number', `node ${node.id} should have numeric x`);
      assert.ok(typeof node.position.y === 'number', `node ${node.id} should have numeric y`);
    }
  });

  it('creates groups by provider/service', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    assert.ok(Array.isArray(spec.groups));
    assert.ok(spec.groups!.length > 0);
  });

  it('uses name attribute as node label when available', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    const node = spec.nodes.find((n) => n.id === 'aws_instance_web');
    assert.equal(node?.label, 'web-server');
  });

  it('throws on invalid JSON', () => {
    assert.throws(() => importTerraform('not json'), /JSON/);
  });

  it('throws on missing resources array', () => {
    assert.throws(
      () => importTerraform(JSON.stringify({ version: 4 })),
      /resources/
    );
  });

  it('includes terraform version in description', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    assert.ok(spec.description?.includes('4'), 'description should include state version');
  });

  it('stores tfType and tfName in node meta', () => {
    const spec = importTerraform(SIMPLE_TFSTATE);
    const node = spec.nodes.find((n) => n.id === 'aws_instance_web');
    assert.equal(node?.meta?.tfType, 'aws_instance');
    assert.equal(node?.meta?.tfName, 'web');
  });
});
