# TI EVM configurator

A fast, source-backed configurator for five Texas Instruments evaluation modules. The four imported EVMs follow a reproducible Altium → Circuit JSON → tscircuit TSX pipeline. Feature conditions are added to the generated component TSX, then every selectable PCB population is rendered with `@tscircuit/core` during the build. Matching schematic populations are filtered from the authored Altium Circuit JSON so its symbols, wires, labels, and sheet layout are not replaced by core's automatic schematic layout. The browser loads only checked-in, gzip-compressed artifacts for instant switching.

The application does not mutate Circuit JSON at runtime and does not use Altium-viewer output as its board source.

Each board also has a shareable detail page linked from the configurator. The page presents checked-in full-board PCB and schematic SVGs for every source sheet, a 3D PNG rendered through the same GLB/PoppyGL pipeline used by the tscircuit snapshot CLI, the board's parameterized `index.circuit.tsx`, and its official TI reference.

## Boards and configurations

| Board | Purpose | Prebuilt variants | TI reference |
| --- | --- | ---: | --- |
| SK-AM62A-LP | Vision AI processor starter kit | 8 | [SK-AM62A-LP](https://www.ti.com/tool/SK-AM62A-LP) |
| DRV8307EVM | 84-component three-phase BLDC pre-driver | 4 | [DRV8307EVM](https://www.ti.com/tool/DRV8307EVM) |
| LM5155EVM-FLY | 91-component isolated flyback converter | 4 | [LM5155EVM-FLY](https://www.ti.com/tool/LM5155EVM-FLY) |
| LM251772EVM-PD | 169-component four-switch buck-boost | 4 | [LM251772EVM-PD](https://www.ti.com/tool/LM251772EVM-PD) |
| LMG342X-BB-EVM | 157-component 650-V GaN half-bridge platform | 4 | [LMG342X-BB-EVM](https://www.ti.com/tool/LMG342X-BB-EVM) |

Each board exposes removable-feature checkboxes plus **Full board** and **Minimal board** shortcuts. SK-AM62A-LP has three independent subsystem groups. The other EVMs expose two board-specific, independently removable evaluation subsystems while retaining the required application power stage and connectors. Every possible checkbox combination is prebuilt, for 24 board/configuration artifacts in total.

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

The download step verifies each official archive against its pinned SHA-256 checksum before extraction. The source archives remain untracked. The generated project Circuit JSON, component-level TSX, compact reference definitions, and provenance metadata are committed. `altium-to-circuit-json` is pinned to a release; the component-aware `circuit-json-to-tscircuit` source revision is pinned by full commit SHA until that converter stack is released.

## Verify

```sh
bun test
bun run typecheck
bun run format:check
bun run build
```

Tests use one focused case per file. They verify catalog provenance, unique option populations, module dependencies, generated-runtime integrity, full and minimal SK-AM62A-LP renders, compressed artifact loading, and routed output for every prebuilt board. Five visual snapshot tests also preserve the full-board PCB and schematic SVG for each EVM.

## Implementation notes

- `lib/generated/am62a-board.tsx` contains the parameterized SK-AM62A-LP reconstruction.
- `lib/generated/ti-evms/*.source.circuit.json.gz` is the reconciled project-level Circuit JSON produced from each official PCB and all of its electrical schematic sheets.
- `lib/generated/ti-evms/*.circuit.tsx` is component-level tscircuit generated from that Circuit JSON and parameterized by removable feature IDs.
- `scripts/generate-ti-evm-reference-definitions.ts` owns the reproducible conversion pipeline and provenance. Its compatibility lowering preserves physical geometry while adapting filled silk, outline keepouts, and repeated same-pin pads to primitives supported by the pinned core runtime.
- `scripts/parameterize-generated-board.ts` adds feature conditions, filters removed or non-PCB trace endpoints, prevents imported net names from colliding with component selectors, and carries Altium pad/via teardrop intent into core's trace props.
- `lib/ti-evm-catalog.ts` owns the five-board catalog and all selectable variants.
- `scripts/prebuild-ti-evm-assets.ts` renders all 24 combinations through `@tscircuit/core`; Pipeline9 is used by default, while LM5155 and LM251772 use Pipeline7 because the pinned Pipeline9 release rejects valid reduced-net topologies on those boards.
- `scripts/prebuild-ti-evm-schematic-assets.ts` applies each variant's component population to the canonical Altium schematic without rerouting or replacing its authored geometry.
- `app/hooks/use-evm-render.ts` loads the selected prebuilt PCB and schematic in parallel and cancels stale requests.

The SK-AM62A-LP is a 12-layer design. The pinned tscircuit releases validate ten layers by default, so the repository carries three narrow Bun patches: `@tscircuit/props` accepts `layers={12}`, `circuit-json` validates `inner9` and `inner10`, and `@tscircuit/checks` runs design-rule checks across all 12 layers. The reference design's two 0.089 mm pad-clearance findings at U90 remain visible in the validation test rather than being hidden.

## Reference-design notice

The geometry is derived from public Texas Instruments reference material and is provided for evaluation and visualization. Texas Instruments and its marks are the property of Texas Instruments Incorporated. Validate signal integrity, power integrity, thermals, manufacturing outputs, and component availability before fabrication.
