# Isometric Diagrams

An interactive isometric diagram viewer built with **Svelte 5** and **SvelteKit**. Diagrams are described in **YAML** and rendered as isometric 3-D SVG scenes directly in the browser. Hosted on **GitHub Pages**.

---

## Features

- 🧊 **Isometric SVG rendering** — colour-coded 3-D boxes for servers, services, databases, queues, warehouses, trucks, and more
- 📝 **YAML spec** — describe your diagram in a simple, human-readable format
- 🔴 **Live editor** — edit YAML in the sidebar and see the diagram update instantly
- 🗺️ **Node groups / regions** — highlight logical regions with dashed boundaries
- 🔗 **Typed edges** — network, flow, dependency, and data connections with optional labels and arrowheads
- 🖱️ **Click to inspect** — click a node to see its metadata
- 🌙 **Dark theme** — built-in dark + light theme support

## Example diagrams

| Example | Description |
|---------|-------------|
| `networking.yaml` | Multi-region AWS microservices architecture |
| `warehouse.yaml` | Cargo flow from port → trucks → warehouse |
| `simple-flow.yaml` | E-commerce order processing flow |

---

## Getting started

\`\`\`bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview
\`\`\`

## Running tests

\`\`\`bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run end-to-end tests
npm test

# Open interactive UI
npm run test:ui
\`\`\`

## YAML Spec format

\`\`\`yaml
title: "My Diagram"
type: networking       # networking | warehouse | flow | generic
description: "Optional description"

settings:
  theme: dark          # dark | light
  tileSize: 64         # base tile size in pixels
  showGrid: true
  padding: 2           # grid units of padding

nodes:
  - id: web
    label: "Web Server"
    type: server       # see NodeType below
    description: "nginx"
    position: { x: 0, y: 0 }  # isometric grid coordinates
    meta:              # arbitrary key/value metadata
      region: us-east-1

edges:
  - from: web
    to: api
    label: "HTTPS"
    type: network      # network | flow | dependency | data
    directed: true

groups:
  - id: us-east
    label: "US East"
    color: "#4299e1"
    nodes: [web, api]
\`\`\`

### Node types

\`server\`, \`service\`, \`database\`, \`loadbalancer\`, \`gateway\`, \`queue\`, \`storage\`, \`warehouse\`, \`dock\`, \`truck\`, \`box\`, \`person\`, \`cloud\`, \`router\`, \`generic\`

### Edge types

\`network\`, \`flow\`, \`dependency\`, \`data\`, \`generic\`

---

## Deployment

The app is automatically deployed to **GitHub Pages** via the [\`deploy.yml\`](.github/workflows/deploy.yml) workflow on every push to \`main\`.

A CI workflow ([\`ci.yml\`](.github/workflows/ci.yml)) runs type-checking, build, and Playwright tests on every push and pull request.
