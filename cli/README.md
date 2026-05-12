# isometric-diagrams CLI

A command-line tool that converts cloud infrastructure templates into
[isometric-diagrams](https://github.com/DaanV2/isometric-diagrams) YAML specs.

## Supported formats

| Format | File type | Detection |
|--------|-----------|-----------|
| **CloudFormation** | `.yaml`, `.json` | `AWSTemplateFormatVersion` / `Resources` key |
| **Terraform state** | `.tfstate`, `.json` | `resources` array + `version` field |
| **Kubernetes** | `.yaml` (multi-document) | `apiVersion` / `kind` fields |

## Installation

```bash
# From the repository root
cd cli
npm install
```

To use it globally (after building):

```bash
npm run build          # compiles TypeScript to dist/
npm link               # symlinks the binary onto your PATH
```

## Usage

```sh
isometric-diagrams import [--format <fmt>] <file>
```

### Options

| Option | Description |
|--------|-------------|
| `--format cloudformation\|terraform\|kubernetes` | Force a specific format (optional; auto-detected when omitted) |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

### Examples

```sh
# CloudFormation template (auto-detected)
isometric-diagrams import cloudformation.yaml > diagram.yaml

# Terraform state file (auto-detected from .tfstate extension)
isometric-diagrams import terraform.tfstate > diagram.yaml

# Kubernetes manifests (force format when filename is ambiguous)
isometric-diagrams import --format kubernetes k8s-resources.yaml > diagram.yaml

# Generate a Terraform state file first if you only have HCL
terraform show -json > terraform.tfstate
isometric-diagrams import terraform.tfstate > diagram.yaml
```

## How it works

### CloudFormation

- Reads the `Resources` section of a CloudFormation template (YAML or JSON).
- Maps each resource's `Type` (e.g. `AWS::Lambda::Function`) to a diagram node type.
- Extracts `DependsOn` and inline `Ref`/`Fn::GetAtt` references as edges.
- Groups nodes by AWS service prefix (e.g. `AWS::Lambda::*` → _Lambda_ group).

### Terraform state

- Parses a Terraform state file (`.tfstate`, JSON format).
- Maps each `resource.type` (e.g. `aws_db_instance`) to a diagram node type.
- Extracts `dependencies` arrays as directed edges.
- Groups nodes by provider + service (e.g. `aws_rds_*` → _AWS Rds_ group).

> **Note:** Plain `.tf` HCL files are not supported. Generate a state file with
> `terraform show -json terraform.tfstate` first.

### Kubernetes

- Parses one or more Kubernetes manifest documents (multi-document YAML supported).
- Maps resource `kind` (e.g. `Deployment`, `Service`, `Ingress`) to diagram node types.
- Derives edges between Services and workloads via label selectors.
- Derives edges from Ingress `backend.service.name` references to Services.
- Groups nodes by namespace.

## Node type mapping

### CloudFormation → node type

| CloudFormation type pattern | Node type |
|-----------------------------|-----------|
| `*LoadBalancer*`, `*ALB*` | `loadbalancer` |
| `AWS::Lambda::Function`, `AWS::ECS::Service` | `service` |
| `*RDS*`, `*DynamoDB*`, `*ElastiCache*` | `database` |
| `*SQS*`, `*SNS*`, `*Kinesis*` | `queue` |
| `*S3*`, `*EFS*` | `storage` |
| `*ApiGateway*` | `gateway` |
| `*CloudFront*`, `*VPC*` | `cloud` |
| `*NatGateway*`, `*InternetGateway*` | `router` |
| `AWS::EC2::Instance` | `server` |
| everything else | `generic` |

### Kubernetes kind → node type

| Kind | Node type |
|------|-----------|
| `Deployment`, `DaemonSet`, `Job`, `CronJob` | `service` |
| `StatefulSet` | `database` |
| `Service` | `loadbalancer` |
| `Ingress`, `IngressRoute` | `gateway` |
| `PersistentVolumeClaim`, `PersistentVolume` | `storage` |
| `Namespace` | `cloud` |
| `ServiceAccount`, `ClusterRoleBinding` | `person` |
| everything else | `generic` |

## Development

```bash
# Run tests
npm test

# Build
npm run build
```

Tests use Node.js's built-in `node:test` runner and require Node.js 18+.
