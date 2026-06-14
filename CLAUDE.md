# Claude Code Guide — isometric-diagrams

## What this project is

A Svelte 5 / SvelteKit web app that renders YAML diagram specs as interactive
isometric 3-D SVG diagrams. Users write YAML; the app projects it through an
isometric coordinate system and paints it as SVG. There is also a standalone
CLI tool (`cli/`) for importing cloud infrastructure (CloudFormation, Terraform,
Kubernetes) into the YAML format.

## Renderer layer architecture

The rendering code has three distinct layers. **Keep them separate.**

```
src/lib/renderer/isometric.ts   ← pure projection math (no diagram types)
src/lib/renderer/shapes.ts      ← drawing primitives (diagram types → SVG geometry)
src/lib/renderer/theme.ts       ← colours and theme constants
src/lib/components/Isometric*.svelte  ← Svelte components (display only)
```

### `isometric.ts` — projection math only

Low-level functions that convert grid coordinates to screen coordinates.
**No diagram types here.** Takes raw numbers, returns numbers or SVG path strings.

Key functions: `isoToScreen`, `boxPaths`, `edgePath`, `arrowHead`,
`flatArrowPath`, `flatArrowHead`, `floorTilePath`, `tilePath`, `boundingBox`.

Coordinate system:
- Grid X-axis → right-and-down on screen
- Grid Y-axis → left-and-down on screen
- Grid Z-axis → straight up (height)
- `screenX = (gx - gy) * tileSize`, `screenY = (gx + gy) * (tileSize/2) - gz * tileSize`

### `shapes.ts` — drawing primitives (the "what to draw" layer)

**This is the layer components should import from.** Each function takes a typed
diagram object + `tileSize` and returns SVG-ready geometry (path strings, polygon
point strings, `ScreenPoint` anchors).

| Function | Returns | Used by |
|---|---|---|
| `nodeBox(node, tileSize)` | `NodeBox` — face paths + label/icon positions | `IsometricNode` |
| `edgeGeometry(from, to, directed, hasLabel, tileSize)` | `EdgeGeometry` — path + arrowhead + midpoint | `IsometricEdge` |
| `flatArrowGeometry(arrow, tileSize)` | `FlatArrowGeometry` — path + arrowhead + midpoint | `IsometricFlatArrow` |
| `floorTileGeometry(tile, tileSize)` | `FloorTileGeometry` — outline path + label position | `IsometricFloorTile` |
| `groupBoundary(members, tileSize, gpad?)` | `GroupBoundary` — isometric parallelogram points + label anchor | `IsometricDiagram` |
| `isoGridLines(nodes, tileSize)` | `string[]` — one SVG path per grid line | `IsometricDiagram` |

`NODE_HEIGHT = 1` is the shared constant for how tall node boxes are in grid
units. Use it instead of hard-coding `1`.

### Svelte components — display only

Components import from `shapes.ts`, compute one `$derived` geometry value, and
bind its named fields into the SVG template. They should contain **no raw
`isoToScreen` / `boxPaths` calls** — if you need a new shape, add it to
`shapes.ts` first.

## Diagram viewport (pan / zoom / export)

`IsometricDiagram` renders a `position:relative` viewport `<div>` that fills its
parent, an `<svg width=100% height=100%>` whose `viewBox` is driven by a
pan/zoom view, and fixed HTML overlays (title, zoom controls, export buttons,
node-info) that do **not** pan/zoom.

- The `viewBox` is kept at the viewport's aspect ratio (`vpW/zoom × vpH/zoom`)
  so screen↔world mapping is linear; this makes wheel-zoom-around-cursor exact.
- `userZoom` / `userCenter` are `null` until the user interacts — the view then
  follows the auto-fit (`fitZoom`/`fitCenter`) derived from the content `bbox`.
  The ⊡ Fit button resets them to `null`.
- Pan starts only when the pointerdown target is not inside a `.iso-node`, so
  node clicks still select.
- Export lives in `src/lib/export.ts` (`downloadSvg` / `downloadPng`). It clones
  the live `<svg>`, inlines each element's **computed** style (scoped component
  CSS and CSS vars don't survive serialization), frames it to the content
  bounds, and paints a background.
- Sharing/persistence: the page persists the doc to `localStorage` and encodes
  permalinks via `src/lib/share.ts` (`encodeShare`/`decodeShare`, base64url).
  Restore order on load: `#d=…` permalink → last session → default example.

## Svelte 5 reactivity rules

- Use `$derived.by(() => { ... })` for computed values whose logic is more than
  a single expression. **Never use `$derived(() => { ... })`** — that stores the
  function itself as the derived value and tracks zero reactive dependencies,
  breaking live updates.
- Use `$derived(expr)` only for simple single-expression derivations.
- Prefer one named `geo` / `box` derived per component over multiple fine-grained
  derived values that call the same function with slightly different args.

## Node rendering

Every node renders as a 1-tile-tall isometric box (`NODE_HEIGHT = 1`).
The box has three faces: `top` (diamond), `left` (parallelogram), `right`
(parallelogram). Face colours come from `getNodeColours(node.type)` in
`theme.ts`. Nodes with an icon render with semi-transparent faces and a centred
emoji.

Painter's algorithm: nodes are sorted by `x + y` before rendering so closer
nodes paint over farther ones.

## Group boundaries

Groups are rendered as isometric parallelograms (SVG `<polygon>`), **not**
axis-aligned rectangles. The four corners are projected from grid space at
cube-top height (`maxZ + NODE_HEIGHT`) so the boundary follows the isometric
grid lines and clears node box tops. The bottom corner is extended down by
`tileSize * 0.5` to cover cube side faces. Computed via `groupBoundary()` in
`shapes.ts`.

## Edge routing

Edges use an L-shaped two-segment path: `(fromX,fromY)` → `(toX,fromY)` →
`(toX,toY)`. Arrowheads are aligned to the **last segment** (the Y-direction
leg arriving at the destination). The `arrowHead()` base point is
`isoToScreen(toX, fromY, ...)` — not `fromX, toY`.

## Draw-in animation

Edges and flat arrows animate by "drawing" their path on mount. The
`drawOnMount` Svelte action (`src/lib/actions/draw-on-mount.ts`) sets
`stroke-dasharray` / `stroke-dashoffset` to the path's real `getTotalLength()`
so the CSS keyframe completes for paths of any length — never hardcode a dash
cap. Apply it with `use:drawOnMount={pathData}`; it re-runs only when the path
data changes.

## Authoring diagnostics

`parseYaml` only guarantees structural well-formedness (and throws a `ParseError`
carrying a 1-based `line` for YAML syntax errors). Semantic problems that would
otherwise fail silently — edges/groups referencing unknown node ids, duplicate
ids, unknown enum values, self-loops, empty diagrams — are reported as
**non-fatal** `Diagnostic`s by `lintSpec(spec)` in `src/lib/parser/lint.ts`.
The editor shows them in a "Problems" panel; each diagnostic carries a `ref`
token the page locates via `findTokenLine` to jump the textarea to the source.
Valid type names come from `NODE_TYPE_NAMES` / `EDGE_TYPE_NAMES` in `theme.ts`
(runtime source of truth, mirroring the unions).

The UI editor and canvas share selection: `IsometricDiagram` and `UiEditor`
both take an optional controlled `selectedId` + `onselect`, lifted to the page.

## Known open issues

See the GitHub issue tracker. The earlier rendering items (#25 hardcoded
`stroke-dasharray`, #27 hardcoded node description offset, #28 edge depth
sorting) are all resolved. Remaining improvement work is tracked in the
performance/usability plan (pan-zoom, persistence/export, editor validation,
drag-to-place, in-app auto-layout).

## Unit testing

The renderer modules have a Vitest unit test suite. Run it with:

```
npm run test:unit          # single run
npm run test:unit:watch    # watch mode
```

### Test file layout

```
src/lib/renderer/__tests__/
  helpers.ts                     ← shared fixtures and utilities (TILE, cfg, makeNode, makeEdge, makeArrow, makeTile, pathNumbers)
  isometric-projection.test.ts   ← isoToScreen
  isometric-boxes.test.ts        ← tilePath, boxPaths
  isometric-edges.test.ts        ← edgePath, arrowHead
  isometric-flat-arrows.test.ts  ← flatArrowPath, flatArrowHead
  isometric-floor.test.ts        ← floorTilePath, boundingBox
  shapes-node.test.ts            ← NODE_HEIGHT, nodeBox
  shapes-sort.test.ts            ← sortEdgesByDepth
  shapes-edge.test.ts            ← edgeGeometry
  shapes-flat-arrow.test.ts      ← flatArrowGeometry
  shapes-floor-tile.test.ts      ← floorTileGeometry
  shapes-group.test.ts           ← groupBoundary
  shapes-grid.test.ts            ← isoGridLines

src/lib/parser/__tests__/
  lint.test.ts                   ← lintSpec, findTokenLine
  examples.test.ts               ← bundled example specs parse + lint clean

src/lib/__tests__/
  share.test.ts                  ← encodeShare / decodeShare round-trips
```

### Testing conventions

- **One file per functional domain**, named `<module>-<domain>.test.ts`.
- **Shared test helpers live in `helpers.ts`** — import `TILE`, `cfg`, `makeNode`, `makeEdge`, `makeArrow`, `makeTile`, and `pathNumbers` from there rather than redefining them per file.
- **Test what the function guarantees**, not its internal implementation: path structure (`M…L…Z`), vertex counts, exact SVG strings for key cases, and behavioural properties (scaling, elevation, default values).
- **Add a new `__tests__/` file** whenever you add a new exported function to `isometric.ts` or `shapes.ts`. Follow the existing naming pattern.
- Vitest is configured in `vite.config.ts` with `include: ['src/**/*.test.ts']`; files under `__tests__/` are picked up automatically.

## Branch conventions

- Active feature/fix work: `fix/<description>` or `feat/<description>`
- Do not push directly to `main`; open a PR from the feature branch

## Public API (`src/lib/index.ts`)

Re-exports the parser, core isometric math functions, theme helpers, and all
TypeScript types. When adding new exported functions to `isometric.ts` or
`shapes.ts` that callers outside the app might need, add them to `index.ts`.
