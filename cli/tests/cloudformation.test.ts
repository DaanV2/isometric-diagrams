import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { importCloudFormation } from '../src/importers/cloudformation.js';

const SIMPLE_CFN = `
AWSTemplateFormatVersion: '2010-09-09'
Description: Simple web stack
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-bucket

  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: my-handler
    DependsOn: MyBucket

  MyDB:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: mydb
`;

const CFN_JSON = JSON.stringify({
  AWSTemplateFormatVersion: '2010-09-09',
  Resources: {
    MyQueue: {
      Type: 'AWS::SQS::Queue',
      Properties: { QueueName: 'tasks' }
    },
    MyLB: {
      Type: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
      Properties: {}
    }
  }
});

describe('CloudFormation importer', () => {
  it('parses a simple YAML template and returns a DiagramSpec', () => {
    const spec = importCloudFormation(SIMPLE_CFN);
    assert.equal(spec.title, 'CloudFormation Diagram');
    assert.equal(spec.type, 'networking');
    assert.ok(Array.isArray(spec.nodes));
    assert.equal(spec.nodes.length, 3);
  });

  it('maps S3 bucket to storage node type', () => {
    const spec = importCloudFormation(SIMPLE_CFN);
    const bucket = spec.nodes.find((n) => n.id === 'MyBucket');
    assert.ok(bucket, 'MyBucket node should exist');
    assert.equal(bucket?.type, 'storage');
  });

  it('maps Lambda function to service node type', () => {
    const spec = importCloudFormation(SIMPLE_CFN);
    const fn = spec.nodes.find((n) => n.id === 'MyFunction');
    assert.ok(fn, 'MyFunction node should exist');
    assert.equal(fn?.type, 'service');
  });

  it('maps RDS instance to database node type', () => {
    const spec = importCloudFormation(SIMPLE_CFN);
    const db = spec.nodes.find((n) => n.id === 'MyDB');
    assert.ok(db, 'MyDB node should exist');
    assert.equal(db?.type, 'database');
  });

  it('extracts DependsOn as an edge', () => {
    const spec = importCloudFormation(SIMPLE_CFN);
    assert.ok(Array.isArray(spec.edges));
    const dep = spec.edges!.find((e) => e.from === 'MyFunction' && e.to === 'MyBucket');
    assert.ok(dep, 'DependsOn edge MyFunction->MyBucket should exist');
  });

  it('assigns grid positions to all nodes', () => {
    const spec = importCloudFormation(SIMPLE_CFN);
    for (const node of spec.nodes) {
      assert.ok(typeof node.position.x === 'number', `node ${node.id} should have numeric x`);
      assert.ok(typeof node.position.y === 'number', `node ${node.id} should have numeric y`);
    }
  });

  it('creates groups for resource types', () => {
    const spec = importCloudFormation(SIMPLE_CFN);
    assert.ok(Array.isArray(spec.groups));
    assert.ok(spec.groups!.length > 0, 'should have at least one group');
  });

  it('parses CloudFormation JSON format', () => {
    const spec = importCloudFormation(CFN_JSON);
    assert.equal(spec.nodes.length, 2);
    const queue = spec.nodes.find((n) => n.id === 'MyQueue');
    assert.equal(queue?.type, 'queue');
    const lb = spec.nodes.find((n) => n.id === 'MyLB');
    assert.equal(lb?.type, 'loadbalancer');
  });

  it('includes description from template', () => {
    const spec = importCloudFormation(SIMPLE_CFN);
    assert.equal(spec.description, 'Simple web stack');
  });

  it('throws on missing Resources section', () => {
    assert.throws(
      () => importCloudFormation('AWSTemplateFormatVersion: "2010-09-09"\n'),
      /Resources/
    );
  });

  it('stores cfnType in node meta', () => {
    const spec = importCloudFormation(SIMPLE_CFN);
    const bucket = spec.nodes.find((n) => n.id === 'MyBucket');
    assert.equal(bucket?.meta?.cfnType, 'AWS::S3::Bucket');
  });
});
