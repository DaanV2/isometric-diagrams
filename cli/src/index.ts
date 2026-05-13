#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import yaml from 'js-yaml';
import { detectFormat, importFile, type ImportFormat } from './importers/index.js';

const HELP = `
Usage:
  isometric-diagrams import [--format <fmt>] <file>

Commands:
  import <file>    Convert a cloud infrastructure file to a diagram YAML spec.

Options:
  --format <fmt>   Force a specific format: cloudformation | terraform | kubernetes
  --help, -h       Show this help message.
  --version, -v    Show version.

Supported formats:
  cloudformation   AWS CloudFormation templates (.yaml, .json)
  terraform        Terraform state files (.tfstate)
  kubernetes       Kubernetes manifests (.yaml, multi-document supported)

Examples:
  isometric-diagrams import cloudformation.yaml > diagram.yaml
  isometric-diagrams import terraform.tfstate > diagram.yaml
  isometric-diagrams import --format kubernetes k8s-manifests.yaml > diagram.yaml
`.trim();

function parseArgs(argv: string[]): {
	command: string | undefined;
	format: ImportFormat | undefined;
	file: string | undefined;
	help: boolean;
	version: boolean;
} {
	const args = argv.slice(2); // remove node + script path
	let command: string | undefined;
	let format: ImportFormat | undefined;
	let file: string | undefined;
	let help = false;
	let version = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--help' || arg === '-h') {
			help = true;
		} else if (arg === '--version' || arg === '-v') {
			version = true;
		} else if (arg === '--format' || arg === '-f') {
			const next = args[++i];
			if (!next) {
				process.stderr.write('Error: --format requires a value (cloudformation | terraform | kubernetes)\n');
				process.exit(1);
			}
			if (!['cloudformation', 'terraform', 'kubernetes'].includes(next)) {
				process.stderr.write(`Error: Unknown format "${next}". Use cloudformation, terraform, or kubernetes.\n`);
				process.exit(1);
			}
			format = next as ImportFormat;
		} else if (!command && !arg.startsWith('-')) {
			command = arg;
		} else if (command && !arg.startsWith('-')) {
			file = arg;
		}
	}

	return { command, format, file, help, version };
}

function main() {
	const { command, format, file, help, version } = parseArgs(process.argv);

	if (version) {
		// Read version from package.json at runtime
		try {
			const pkgPath = new URL('../package.json', import.meta.url);
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
			process.stdout.write(`${pkg.version}\n`);
		} catch {
			process.stdout.write('0.1.0\n');
		}
		process.exit(0);
	}

	if (help || !command) {
		process.stdout.write(HELP + '\n');
		process.exit(0);
	}

	if (command !== 'import') {
		process.stderr.write(`Error: Unknown command "${command}". Run with --help for usage.\n`);
		process.exit(1);
	}

	if (!file) {
		process.stderr.write('Error: No input file specified.\nUsage: isometric-diagrams import <file>\n');
		process.exit(1);
	}

	const filePath = resolve(file);
	let content: string;
	try {
		content = readFileSync(filePath, 'utf-8');
	} catch (err) {
		process.stderr.write(`Error: Cannot read file "${filePath}": ${(err as Error).message}\n`);
		process.exit(1);
	}

	let resolvedFormat = format;
	if (!resolvedFormat) {
		try {
			resolvedFormat = detectFormat(basename(filePath), content);
		} catch (err) {
			process.stderr.write(`Error: ${(err as Error).message}\n`);
			process.exit(1);
		}
	}

	if (!resolvedFormat) {
		process.stderr.write(
			`Error: Cannot detect format for "${basename(filePath)}". ` +
			'Use --format cloudformation|terraform|kubernetes to specify it explicitly.\n'
		);
		process.exit(1);
	}

	try {
		const spec = importFile(content, resolvedFormat);
		process.stdout.write(yaml.dump(spec, { lineWidth: 120 }));
	} catch (err) {
		process.stderr.write(`Error: Import failed: ${(err as Error).message}\n`);
		process.exit(1);
	}
}

main();
