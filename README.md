# TI EVM configurator

A fast, source-backed configurator for five Texas Instruments evaluation modules. All five EVMs follow a reproducible Altium → Circuit JSON → tscircuit TSX pipeline. Feature conditions are added to the generated component TSX, then every selectable PCB population is rendered with `@tscircuit/core` during the build. Matching schematic populations are filtered from the authored Altium Circuit JSON so its symbols, wires, labels, and sheet layout are not replaced by core's automatic schematic layout. The browser loads only checked-in, gzip-compressed artifacts for instant switching.

The application does not mutate Circuit JSON at runtime and does not use Altium-viewer output as its board source.

Each board also has a shareable detail page linked from the configurator. The page presents checked-in full-board PCB and schematic SVGs for every source sheet, a 3D PNG rendered through the same GLB/PoppyGL pipeline used by the tscircuit snapshot CLI, the board's parameterized `index.circuit.tsx`, and its official TI reference.

## Boards and configurations

| Board | Purpose | Prebuilt variants | TI reference |
| --- | --- | ---: | --- |
| DP83825EVM | 10/100-Mbps Ethernet PHY evaluation module | 7 | [DP83825EVM](https://www.ti.com/tool/DP83825EVM) |
| DRV8307EVM | 84-component three-phase BLDC pre-driver | 6 | [DRV8307EVM](https://www.ti.com/tool/DRV8307EVM) |
| LM5155EVM-FLY | 91-component isolated flyback converter | 4 | [LM5155EVM-FLY](https://www.ti.com/tool/LM5155EVM-FLY) |
| LM251772EVM-PD | 169-component four-switch buck-boost | 6 | [LM251772EVM-PD](https://www.ti.com/tool/LM251772EVM-PD) |
| LMG342X-BB-EVM | 157-component 650-V GaN half-bridge platform | 8 | [LMG342X-BB-EVM](https://www.ti.com/tool/LMG342X-BB-EVM) |

Each board exposes a named variant selector, including **Full board**, **Minimal board**, and curated intermediate populations. Only electrically independent evaluation subsystems are removable; required configuration selectors, strap networks, application circuitry, and cooling hardware remain populated. All 31 selectable variants are prebuilt.

## Run locally

```sh
bun install --no-save
bun run dev
```

## Rebuild all configurations

```sh
bun run prebuild:ti-evms
```

The prebuild imports the generated components directly, renders every PCB population with `new Circuit()` and `renderUntilSettled()`, rejects failed components, routing errors, and zero-trace PCB output, applies the same feature selection to the authored schematic, compresses both Circuit JSON artifacts under `public/prebuilt-ti-evms`, and records source and element counts in the manifest. It does not use `eval`, a web worker, or browser-side circuit generation.

The same command regenerates `public/board-details` from each full-board Circuit JSON. The detail artifacts are static so the browser does not rerun SVG or 3D rendering.

To regenerate the checked-in Circuit JSON and parameterized TSX from TI's original Altium files:

```sh
bun run generate:ti-evm-references
```

The download step verifies each official archive against its pinned SHA-256 checksum before extraction. The source archives remain untracked. The generated project Circuit JSON, component-level TSX, compact reference definitions, and provenance metadata are committed. The Altium parser and Altium converter are pinned to exact releases. `circuit-json-to-tscircuit` remains pinned to the component-preserving converter commit required by the parameterization pipeline.

## Verify

```sh
bun test
bun run typecheck
bun run format:check
bun run build
```

Tests use one focused case per file. They verify catalog provenance, unique option populations, generated project metadata, compressed artifact loading, converter cleanup, and routed output for every prebuilt board. Five visual snapshot tests preserve the full-board PCB and schematic SVG for each EVM, while per-board fidelity tests compare generated TSX against its source Circuit JSON.

## Implementation notes

- `lib/generated/ti-evms/*.source.circuit.json.gz` is the reconciled project-level Circuit JSON produced from each official PCB and all of its electrical schematic sheets.
- `lib/generated/ti-evms/*.circuit.tsx` is component-level tscircuit generated from that Circuit JSON and parameterized by removable feature IDs.
- `scripts/generate-ti-evm-reference-definitions.ts` is the thin entrypoint for the reproducible conversion pipeline. The focused stages under `scripts/ti-evm-reference-generator` own the reference catalog, Altium extraction, pads, teardrops, schematic placement, silkscreen, compatibility lowering, and artifact writing. Generated gzip artifacts use a fixed timestamp so unchanged inputs reproduce byte-for-byte.
- `scripts/parameterize-generated-board.ts` orchestrates the generated-TSX transformation. Its AST traversal and source template live under `scripts/generated-board-source`; together they add feature conditions, filter removed or non-PCB trace endpoints, prevent imported net names from colliding with component selectors, and carry Altium pad/via teardrop intent into core's trace props.
- `lib/ti-evm-catalog.ts` owns the five-board catalog and all selectable variants.
- `scripts/prebuild-ti-evm-assets.ts` renders all 31 curated variants through `@tscircuit/core`; generated boards use Core's default autorouter pipeline.
- `scripts/prebuild-ti-evm-schematic-assets.ts` applies each variant's component population to the canonical Altium schematic without rerouting or replacing its authored geometry.
- `app/hooks/use-evm-render.ts` loads the selected prebuilt PCB and schematic in parallel, ignores stale requests, and reuses the parsed result when a variant is selected again.
- `app/components/DesignViewer.tsx` lazy-loads each viewer, preserves renderer state across variant changes, and starts in Canvas only when the selected board contains geometry unsupported by WebGPU.
- `vercel.json` gives prebuilt Circuit JSON a short browser cache while Vercel automatically edge-caches the static files for each deployment.

## Reference-design notice

The geometry is derived from public Texas Instruments reference material and is provided for evaluation and visualization. Texas Instruments and its marks are the property of Texas Instruments Incorporated. Validate signal integrity, power integrity, thermals, manufacturing outputs, and component availability before fabrication.
