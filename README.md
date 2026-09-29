# TI SK-AM62A-LP configurator

A source-backed configurator for the real Texas Instruments
[SK-AM62A-LP](https://www.ti.com/tool/SK-AM62A-LP) evaluation module. Every
configuration is rendered from the same parameterized tscircuit TSX board; the
application does not import an Altium conversion or filter static Circuit JSON.

The 53,001-line TSX reconstruction retains the reference board's 12-layer stack,
84.99983 mm × 150.096728 mm outline, component placement, copper routes, vias,
module ownership, and schematic ownership. Its full render contains 1,482 source
components, 5,137 source traces, 5,009 PCB traces, and 3,392 vias.

## Configurations

- Full evaluation kit
- Vision AI camera
- Headless edge AI
- Industrial gateway
- Minimum bring-up

Each selection becomes module flags passed directly to `AM62ABoard`. Required
processor, LPDDR4, power, clock, reset, and boot circuitry is always retained.
Optional modules and their dependency flags are conditionally rendered by TSX.
Changing the variant therefore rerenders the board model during the prebuild;
the browser only loads the resulting checked-in artifact for fast switching.

## Run locally

```sh
bun install --no-save
bun run dev
```

## Rebuild all configurations

```sh
bun run prebuild:ti-evms
```

This evaluates `lib/generated/am62a-board.tsx` five times with different typed
module selections and writes gzip-compressed Circuit JSON under
`public/prebuilt-ti-evms/sk-am62a-lp`. The manifest records the TSX source for
every artifact.

## Verify

```sh
bun test
bun run typecheck
bun run format:check
bun run build
```

Tests use one focused case per file. They verify module dependencies, all five
parameter selections, generated-runtime integrity, full and minimal renders,
gzip loading, and fixed reference-design invariants for dimensions, layers,
components, source traces, routed PCB traces, and vias.

## Implementation notes

- `lib/generated/am62a-board.tsx` is the parameterized board reconstruction.
- `lib/module-config.ts` owns the optional feature groups and required-module
  dependencies.
- `lib/server/evaluate-board.tsx` evaluates `AM62ABoard` with a selected flag
  set; it does not accept Circuit JSON as its board source.
- `scripts/prebuild-ti-evm-assets.ts` renders the five TSX configurations.
- `app/hooks/use-evm-render.ts` loads the selected prebuilt result and cancels
  stale requests.

The board is 12 layers. The pinned tscircuit releases validate ten layers by
default, so the repository carries three narrow Bun patches:
`@tscircuit/props` accepts `layers={12}`, `circuit-json` validates `inner9` and
`inner10`, and `@tscircuit/checks` runs design-rule checks across all 12 layers.
The reference design's two 0.089 mm pad-clearance findings at U90 remain visible
in the validation test rather than being hidden.

## Reference-design notice

The geometry is derived from the public Texas Instruments reference design and
is provided for evaluation and visualization. Texas Instruments and its marks
are the property of Texas Instruments Incorporated. Validate signal integrity,
power integrity, thermals, manufacturing outputs, and component availability
before fabrication.
