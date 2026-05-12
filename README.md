# Isometric Diagrams

An interactive isometric diagram viewer built with **Svelte 5** and **SvelteKit**. Describe your architecture or data-flow in plain **YAML** and get a rendered isometric 3-D SVG scene directly in the browser.

🔗 **[Live demo on GitHub Pages](https://daanv2.github.io/isometric-diagrams/)**

---

## Features

- 🧊 **Isometric SVG rendering** — colour-coded 3-D boxes for servers, services, databases, queues, warehouses, trucks, and more
- 📝 **YAML spec** — describe your diagram in a simple, human-readable format
- 🔴 **Live editor** — edit YAML in the sidebar and see the diagram update instantly
- 🗺️ **Node groups / regions** — highlight logical regions with dashed boundaries
- 🔗 **Typed edges** — network, flow, dependency, and data connections with optional labels and arrowheads
- 🖱️ **Click to inspect** — click a node to see its metadata
- 🌙 **Dark / light theme** — built-in theme support

## Example diagrams

| File | Description |
|------|-------------|
| [`networking.yaml`](static/examples/networking.yaml) | Multi-region AWS microservices architecture |
| [`warehouse.yaml`](static/examples/warehouse.yaml) | Cargo flow from port → trucks → warehouse |
| [`simple-flow.yaml`](static/examples/simple-flow.yaml) | E-commerce order processing flow |

## Getting started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview
```

## Running tests

```bash
# Install Playwright browsers (first time only)
npx playwright install chromium

# Run end-to-end tests
npm test

# Open the interactive test UI
npm run test:ui
```

## Deployment

The app is automatically deployed to **GitHub Pages** via the [`deploy.yml`](.github/workflows/deploy.yml) workflow on every push to `main`.

A CI workflow ([`ci.yml`](.github/workflows/ci.yml)) runs type-checking, build, and Playwright tests on every push and pull request.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, YAML spec reference, and contribution guidelines.

## License

[MIT](LICENSE) © Daan Verstraten
