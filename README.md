# TI EVM configurator

A source-backed viewer for substantial Texas Instruments evaluation modules. The
demo uses real TI reference-design files and loads prebuilt Circuit JSON, so board
and variant changes are immediate and do not depend on a long-running serverless
render.

## Included EVMs

| EVM | Source | What is prebuilt |
| --- | --- | --- |
| SK-AM62A-LP | Parameterized tscircuit TSX reconstructed from TI's 12-layer design | Five curated configurations, from the full kit to minimum bring-up |
| TMDS62LEVM Rev. B | TI SPRCAL9 Altium project | The 59,234-element PCB and all 57 schematic sheets |
| AM62L-EVSE-DEV-EVM | TI SLVMEM2 Altium project | Released assembly 001, its 28,753-element PCB, and all 16 schematic sheets |

The SK-AM62A-LP choices are explicit system configurations rather than an
arbitrary powerset. Required processor, memory, power, boot, clock, and reset
circuits remain present, while each configuration selects coherent optional
subsystems and their shared dependencies. The other two projects are shown as
their exact released TI assemblies; the demo does not claim unsupported
depopulation options for them.

The variant selector swaps checked-in prebuilt artifacts. Multi-sheet Altium
projects also expose a schematic-page selector. The PCB viewer has trace and pad
hover focus enabled.

## Run locally

```sh
bun install --no-save
bun run dev
```

## Rebuild the source artifacts

```sh
bun run prebuild:ti-evms
```

The prebuild renders each SK-AM62A-LP TSX configuration, downloads the two
published TI archives, verifies their SHA-256 checksums, converts the Altium PCB
and schematic documents, and writes gzip-compressed Circuit JSON under
`public/prebuilt-ti-evms`.

The exact upstream archive checksums are recorded in
`public/prebuilt-ti-evms/manifest.json`:

- SPRCAL9 / TMDS62LEVM Rev. B:
  `40e6c4d0bea5381bf7b4e0ef26ec4ec9adae156be308e4a3838bd344972b7615`
- SLVMEM2 / AM62L-EVSE-DEV-EVM:
  `c9b92c2ce9e6262e5118aa0d1a63794866ac56f4a9843197def220d0297751dc`

Downloaded archives live in the ignored `.cache/ti-evm-sources` directory. They
are not committed.

## Verify

```sh
bun test
bun run typecheck
bun run format:check
bun run build
```

Tests use one focused case per file. They cover the EVM catalog, prebuilt artifact
manifest and files, gzip parsing, module dependency derivation, generated runtime,
and the full and minimal SK-AM62A-LP renders.

## Implementation notes

- `lib/ti-evm-catalog.ts` is the single catalog for EVMs, variants, official TI
  links, and schematic pages.
- `scripts/prebuild-ti-evm-assets.ts` owns deterministic source acquisition,
  checksum verification, conversion, validation, and compression.
- `lib/generated/am62a-board.tsx` is the parameterized SK-AM62A-LP board. It
  retains imported coordinates, copper routes, component ownership, and
  schematic-sheet ownership.
- `app/hooks/use-evm-render.ts` loads the selected prebuilt PCB and schematic in
  parallel and cancels stale selections.
- `app/components/DesignViewer.tsx` uses `@tscircuit/pcb-viewer` directly so net
  focus on hover remains available.

The SK-AM62A-LP is a 12-layer board. The pinned tscircuit releases validate ten
layers by default, so the repository carries three narrow Bun patches:
`@tscircuit/props` accepts `layers={12}`, `circuit-json` validates `inner9` and
`inner10`, and `@tscircuit/checks` runs design-rule checks across all 12 layers.
The source design's two 0.089 mm pad-clearance findings at U90 are retained in the
dedicated validation test rather than hidden.

## Reference-design notice

The board geometry is derived from public Texas Instruments reference designs and
is provided for evaluation and visualization. Texas Instruments and its marks are
the property of Texas Instruments Incorporated. Validate signal integrity, power
integrity, thermals, manufacturing outputs, and component availability before
fabrication.
