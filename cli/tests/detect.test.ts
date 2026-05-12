import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectFormat } from '../src/importers/index.js';

describe('detectFormat', () => {
  it('detects .tfstate by extension', () => {
    assert.equal(detectFormat('infra.tfstate', '{}'), 'terraform');
  });

  it('detects CloudFormation YAML by content', () => {
    const content = 'AWSTemplateFormatVersion: "2010-09-09"\nResources:\n  Foo:\n    Type: AWS::S3::Bucket\n';
    assert.equal(detectFormat('template.yaml', content), 'cloudformation');
  });

  it('detects Kubernetes YAML by apiVersion/kind', () => {
    const content = 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\n';
    assert.equal(detectFormat('manifest.yaml', content), 'kubernetes');
  });

  it('detects Terraform state JSON by structure', () => {
    const content = JSON.stringify({ version: 4, resources: [] });
    assert.equal(detectFormat('state.json', content), 'terraform');
  });

  it('detects CloudFormation JSON by structure', () => {
    const content = JSON.stringify({ AWSTemplateFormatVersion: '2010-09-09', Resources: {} });
    assert.equal(detectFormat('cfn.json', content), 'cloudformation');
  });

  it('returns undefined for unrecognised content', () => {
    assert.equal(detectFormat('unknown.txt', 'hello world'), undefined);
  });

  it('throws a helpful error for .tf files', () => {
    assert.throws(() => detectFormat('main.tf', 'resource "aws_s3_bucket" ...'), /tfstate/);
  });

  it('detects by filename containing "kubernetes"', () => {
    const content = 'foo: bar';
    assert.equal(detectFormat('kubernetes-resources.yaml', content), 'kubernetes');
  });

  it('detects by filename containing "cloudformation"', () => {
    const content = 'foo: bar';
    assert.equal(detectFormat('cloudformation-stack.yaml', content), 'cloudformation');
  });
});
