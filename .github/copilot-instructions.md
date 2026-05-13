# Copilot Agent Instructions

## Pre-submit Checks

Before committing or opening a pull request, always run the following checks in order:

### 1. Lint
```bash
npm run lint
```
All lint errors must be resolved. Fix each error before proceeding.

### 2. Type-check
```bash
npm run check
```
All TypeScript and Svelte type errors must be resolved.

### 3. Build
```bash
npm run build
```
The production build must complete without errors.

### 4. Tests (Chromium only for speed; CI runs all browsers)
```bash
npx playwright test --project=chromium
```
All Chromium tests must pass before submitting. The full suite (including Firefox) runs in CI.

---

## Project Overview

- **Framework**: SvelteKit 5 with `adapter-static` (GitHub Pages)
- **Language**: TypeScript (strict)
- **YAML parsing**: `js-yaml` via `src/lib/parser/yaml-parser.ts`
- **Diagram rendering**: `src/lib/components/IsometricDiagram.svelte`
- **Visual UI editor**: `src/lib/components/UIEditor.svelte`
- **E2E tests**: Playwright (`tests/e2e/`)

## Key Conventions

- Use Svelte 5 runes (`$state`, `$derived`, `$effect`) for local component state.
- For state that drives `{#if}` template branches across async boundaries, prefer a Svelte `writable` store (imported from `svelte/store`) and `$store` template syntax — Svelte 5 `$state` signals inside nested `{#if}` blocks may not re-render in the production static build.
- All `{#each}` blocks must have a key expression: `{#each items as item (item.id)}`.
- Do not commit debug scripts, temporary test files, or build artefacts.
- Prefer `npm run lint:fix` to auto-fix simple style violations before manually reviewing remaining errors.
