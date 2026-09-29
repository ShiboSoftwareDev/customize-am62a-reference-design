# TI EVM configurator

A fast, source-backed configurator for five Texas Instruments evaluation modules. Each board and every selectable population is rendered from parameterized tscircuit TSX during the build; the browser loads the checked-in, gzip-compressed Circuit JSON artifacts for instant switching.

The application does not remove elements from static Circuit JSON and does not use Altium-viewer output as its board source.

## Boards and configurations

| Board | Purpose | Prebuilt variants | TI reference |
| --- | --- | ---: | --- |
| SK-AM62A-LP | Vision AI processor starter kit | 8 | [SK-AM62A-LP](https://www.ti.com/tool/SK-AM62A-LP) |
| BQ25731EVM | 1-to-5-cell buck-boost battery charger | 4 | [BQ25731EVM](https://www.ti.com/tool/BQ25731EVM) |
| DRV8210EVM | Low-voltage H-bridge motor driver | 4 | [DRV8210EVM](https://www.ti.com/tool/DRV8210EVM) |
| LMK1C1104EVM | Four-output low-jitter clock buffer | 4 | [LMK1C1104EVM](https://www.ti.com/tool/LMK1C1104EVM) |
| TPS62933PEVM | 3-A synchronous buck converter | 4 | [TPS62933PEVM](https://www.ti.com/tool/TPS62933PEVM) |

Each board exposes removable-feature checkboxes plus **Full board** and **Minimal board** shortcuts. SK-AM62A-LP has three independent subsystem groups and the other EVMs independently configure their evaluation controls and measurement points while retaining required application connectors. Every possible checkbox combination is prebuilt, for 24 board/configuration artifacts in total.

## Run locally

```sh
bun install --no-save
bun run dev
```

## Rebuild all configurations

```sh
bun run prebuild:ti-evms
```

The prebuild renders every TSX population, rejects failed components and zero-trace PCB output, compresses the Circuit JSON under `public/prebuilt-ti-evms`, and records source and element counts in the manifest.

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
- `lib/evms/parameterized-ti-evms.tsx` contains the four additional parameterized EVM compositions.
- The TI application circuits are pinned to an immutable `tscircuit/ti` commit.
- A one-line package patch maps the BQ25731 exposed thermal pad to pin 33 so the reference circuit can be autorouted instead of silently producing no copper.
- `lib/ti-evm-catalog.ts` owns the five-board catalog and all selectable variants.
- `scripts/prebuild-ti-evm-assets.ts` evaluates all 24 combinations from TSX.
- `app/hooks/use-evm-render.ts` loads the selected prebuilt result and cancels stale requests.

The SK-AM62A-LP is a 12-layer design. The pinned tscircuit releases validate ten layers by default, so the repository carries three narrow Bun patches: `@tscircuit/props` accepts `layers={12}`, `circuit-json` validates `inner9` and `inner10`, and `@tscircuit/checks` runs design-rule checks across all 12 layers. The reference design's two 0.089 mm pad-clearance findings at U90 remain visible in the validation test rather than being hidden.

## Reference-design notice

The geometry is derived from public Texas Instruments reference material and is provided for evaluation and visualization. Texas Instruments and its marks are the property of Texas Instruments Incorporated. Validate signal integrity, power integrity, thermals, manufacturing outputs, and component availability before fabrication.
