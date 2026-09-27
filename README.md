# SK-AM62A-LP board configurator

A working recreation of the TI SK-AM62A-LP reference-design configurator using
conditional tscircuit TSX. Module choices control which components, imported PCB
routes, and schematic sheets are instantiated. The processor, USB-C input, LPDDR4,
PMIC, clock, reset, and boot circuitry remain required.

The PCB uses `@tscircuit/pcb-viewer` directly with `focusOnHover` enabled. Hovering
a pad or trace focuses the connected net; the previous demo's runframe wrapper
explicitly disabled that behavior.

## Run locally

```sh
bun install --no-save
bun run dev
```

Open the printed local URL. On a typical development machine, an uncached minimal
render takes roughly 10–20 seconds and the all-modules interactive render roughly
20–30 seconds. Rendered Circuit JSON is cached in IndexedDB, and the server keeps a
small in-memory cache for repeated configurations. The last successful board
remains visible while a new selection renders.

## Verify

```sh
bun test
bun run typecheck
bun run format:check
bun run build
```

## Architecture

- `lib/generated/am62a-board.tsx` is the complete parameterized board. It retains
  imported coordinates, copper routes, component ownership, and schematic-sheet
  ownership from the converted reference design.
- `lib/module-config.ts` maps the ten user-facing feature groups to the underlying
  board modules and their shared dependencies.
- `lib/server/evaluate-board.tsx` renders selected TSX with `@tscircuit/core`.
- `api/server.ts` provides the Vercel-compatible evaluate and source endpoints.
- `app/components/DesignViewer.tsx` intentionally bypasses runframe so trace-hover
  focus is enabled.

The original board is 12-layer. The pinned tscircuit releases validate only ten
layers by default, so the repository carries three small native Bun patches:
`@tscircuit/props` accepts `layers={12}`, `circuit-json` validates `inner9` and
`inner10`, and `@tscircuit/checks` runs design-rule checks across all 12 layers.
`bun install` applies them automatically.

The generated board file is kept out of formatter passes to avoid meaningless
churn. Authored files follow the tscircuit handbook conventions, including named
parameter objects and focused one-test-per-file coverage. The render smoke test
asserts that a minimal configuration retains its imported PCB traces and
schematic groups without source-render failures, while running design-rule checks
across the full stack. The source design currently reports two 0.089 mm pad
clearance findings at U90; those findings are preserved rather than hidden.
The interactive render path skips the expensive full-board DRC pass so every
configuration fits within the deployment timeout; DRC remains enabled in the
dedicated validation test.

## Deployment

The repository includes `vercel.json`; importing the repository into Vercel is
enough to build the Vite frontend and Bun server function. The render function
requests Vercel's maximum duration because the full 12-layer design is large.

## Reference-design notice

The board geometry was generated from the public TI SK-AM62A-LP reference design
and is provided for evaluation and visualization. Texas Instruments and its marks
are the property of Texas Instruments Incorporated. Validate the selected design,
signal integrity, power integrity, thermals, manufacturing outputs, and component
availability before fabrication.
