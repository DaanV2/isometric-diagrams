import { importCloudFormation } from './cloudformation.js';
import { importTerraform } from './terraform.js';
import { importKubernetes } from './kubernetes.js';
import type { DiagramSpec } from '../types.js';

export type ImportFormat = 'cloudformation' | 'terraform' | 'kubernetes';

/**
 * Detect the import format from the file extension and/or content.
 * Returns undefined if the format cannot be detected.
 */
export function detectFormat(filePath: string, content: string): ImportFormat | undefined {
	const lower = filePath.toLowerCase();

	// Extension-based detection
	if (lower.endsWith('.tfstate')) return 'terraform';
	if (lower.endsWith('.tf')) {
		throw new Error(
			'Plain Terraform HCL (.tf) files are not supported. Please provide a Terraform state file (.tfstate) instead.\n' +
			'Generate one with: terraform show -json terraform.tfstate'
		);
	}

	// Content-based detection for YAML/JSON files
	const trimmed = content.trimStart();
	const isJson = trimmed.startsWith('{') || trimmed.startsWith('[');

	if (isJson) {
		// Try to detect Terraform state by JSON structure
		try {
			const obj = JSON.parse(content) as Record<string, unknown>;
			if (Array.isArray(obj['resources']) && typeof obj['version'] === 'number') {
				return 'terraform';
			}
		} catch {
			// not JSON
		}
		// CloudFormation can also be JSON
		try {
			const obj = JSON.parse(content) as Record<string, unknown>;
			if ('Resources' in obj || 'AWSTemplateFormatVersion' in obj) {
				return 'cloudformation';
			}
		} catch {
			// not JSON
		}
	}

	// YAML heuristics
	if (content.includes('AWSTemplateFormatVersion') || content.includes('Resources:')) {
		return 'cloudformation';
	}
	if (content.includes('"terraform_version"') || content.includes('"resources"')) {
		return 'terraform';
	}
	if (content.includes('apiVersion:') || content.includes('kind:')) {
		return 'kubernetes';
	}

	// File name heuristics
	if (lower.includes('cloudformation') || lower.includes('cfn') || lower.includes('template')) {
		return 'cloudformation';
	}
	if (lower.includes('terraform') || lower.includes('tfstate')) {
		return 'terraform';
	}
	if (lower.includes('k8s') || lower.includes('kubernetes') || lower.includes('manifest') || lower.includes('kube')) {
		return 'kubernetes';
	}

	return undefined;
}

/** Import a cloud infrastructure file and return a DiagramSpec */
export function importFile(content: string, format: ImportFormat): DiagramSpec {
	switch (format) {
		case 'cloudformation':
			return importCloudFormation(content);
		case 'terraform':
			return importTerraform(content);
		case 'kubernetes':
			return importKubernetes(content);
	}
}

export { importCloudFormation, importTerraform, importKubernetes };
