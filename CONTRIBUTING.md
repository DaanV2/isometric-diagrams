# Contributing to Isometric Diagrams

Thank you for taking the time to contribute! This document covers everything you need to get started.

---

## Table of contents

- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [YAML spec reference](#yaml-spec-reference)
- [Submitting changes](#submitting-changes)
- [Reporting issues](#reporting-issues)

---

## Development setup

**Prerequisites:** Node.js 20+, npm

```bash
# Clone the repository
git clone https://github.com/DaanV2/isometric-diagrams.git
cd isometric-diagrams

# Install dependencies
npm install

# Start the dev server (http://localhost:5173)
npm run dev
```

### Useful commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server with hot-reload |
| `npm run build` | Build for production (output in `build/`) |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run Svelte type-checking |
| `npm test` | Run Playwright end-to-end tests |
| `npm run test:ui` | Open the interactive Playwright test UI |

### Running tests

End-to-end tests are written with [Playwright](https://playwright.dev). Install the browser binaries once before running them:

```bash
npx playwright install chromium
npm test
```

The CI pipeline runs type-checking, a production build, and all Playwright tests on every push and pull request.

---

## Project structure

```
isometric-diagrams/
├── src/
│   ├── lib/
│   │   ├── components/   # Svelte UI components (editor, diagram canvas, …)
│   │   ├── parser/       # YAML → internal diagram model
│   │   ├── renderer/     # SVG / isometric rendering logic
│   │   ├── types/        # TypeScript type definitions
│   │   └── assets/       # Static assets used by lib code
│   └── routes/           # SvelteKit page routes
├── static/
│   └── examples/         # Bundled example YAML diagrams
├── tests/                # Playwright end-to-end tests
├── .github/workflows/
│   ├── ci.yml            # Type-check → build → test on every push/PR
│   └── deploy.yml        # Deploy to GitHub Pages on push to main
└── ...config files
```

---

## YAML spec reference

Each diagram is a single YAML file with the following top-level keys.

```yaml
title: "My Diagram"
type: networking       # networking | warehouse | flow | generic
description: "Optional description"

settings:
  theme: dark          # dark | light
  tileSize: 64         # base tile size in pixels
  showGrid: true
  padding: 2           # grid units of padding around the scene

nodes:
  - id: web
    label: "Web Server"
    type: server       # see node types below
    description: "nginx reverse proxy"
    position: { x: 0, y: 0 }   # isometric grid coordinates
    meta:                       # arbitrary key/value metadata
      region: us-east-1

edges:
  - from: web
    to: api
    label: "HTTPS"
    type: network      # see edge types below
    directed: true

groups:
  - id: us-east
    label: "US East"
    color: "#4299e1"
    nodes: [web, api]
```

### Node types

| Type | Description |
|------|-------------|
| `server` | Generic server / VM |
| `service` | Microservice / application |
| `database` | Relational or NoSQL database |
| `loadbalancer` | Load balancer / reverse proxy |
| `gateway` | API or network gateway |
| `queue` | Message queue / event bus |
| `storage` | Object storage / file system |
| `warehouse` | Physical or logical warehouse |
| `dock` | Loading dock |
| `truck` | Transport vehicle |
| `box` | Generic box / package |
| `person` | User or actor |
| `cloud` | Cloud provider / region |
| `router` | Network router / switch |
| `generic` | Fallback / custom node |

### Edge types

| Type | Typical use |
|------|-------------|
| `network` | Network connectivity |
| `flow` | Data or process flow |
| `dependency` | Build / runtime dependency |
| `data` | Data transfer / pipeline |
| `generic` | Fallback / custom edge |

---

## Submitting changes

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. Make your changes and ensure all checks pass:
   ```bash
   npm run check
   npm run build
   npm test
   ```
3. Commit with a clear message, then open a **pull request** against `main`.
4. Describe *what* the PR changes and *why* in the PR description.

Pull requests are welcome for bug fixes, new node/edge types, renderer improvements, new example diagrams, or documentation updates.

---

## Reporting issues

Please [open an issue](https://github.com/DaanV2/isometric-diagrams/issues) and include:

- A short description of the problem or feature request
- Steps to reproduce (for bugs)
- The YAML that triggers the issue, if applicable
- Browser and OS if it is a rendering bug
