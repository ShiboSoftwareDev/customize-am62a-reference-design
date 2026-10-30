# Sitara board configurator

A fast, source-backed configurator for four Sitara evaluation and development boards. All four boards follow a reproducible source PCB → Circuit JSON → tscircuit TSX pipeline. Feature conditions are added to the generated component TSX, then every selectable PCB population is rendered with `@tscircuit/core` during the build. Matching schematic populations are filtered from the authored source Circuit JSON so its symbols, wires, labels, and sheet layout are not replaced by core's automatic schematic layout. The browser loads only checked-in, gzip-compressed artifacts for instant switching.

The application does not mutate Circuit JSON at runtime and does not use Altium-viewer output as its board source.

Each board also has a shareable detail page linked from the configurator. The page presents checked-in full-board PCB and schematic SVGs for every source sheet, a 3D PNG rendered through the same GLB/PoppyGL pipeline used by the tscircuit snapshot CLI, the board's parameterized `index.circuit.tsx`, and its source reference.

## Boards and configurations

| Board | Purpose | Prebuilt variants | TI reference |
| --- | --- | ---: | --- |
| TMDS62LEVM | AM62L evaluation module | 6 | [TMDS62LEVM](https://www.ti.com/tool/TMDS62LEVM) |
| SK-AM62 | AM62x starter kit | 6 | [SK-AM62](https://www.ti.com/tool/SK-AM62) |
| BeaglePlay | AM625 development platform | 6 | [BeaglePlay](https://www.beagleboard.org/boards/beagleplay) |
| BeagleBone Black | AM3358 development platform | 5 | [BeagleBone Black](https://www.beagleboard.org/boards/beaglebone-black) |

Each board exposes a named variant selector, including **Full board**, **Minimal board**, and curated intermediate populations. Only complete optional subsystems are removable; shared processor, power, memory, configuration, and expansion infrastructure remains populated. All 23 selectable variants are prebuilt.

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

Each population renders in a separate Bun process so its native geometry runtime is released before the next population starts. A failed render or missing copper stops the build before an incomplete artifact is cached.

Copper uses the existing `<copperpour>` component on every copper layer. Reference copper is preserved to retain Altium's fine clearances and original connections. Authored polygon boundaries compute additional fill against each population during prebuild, reclaiming clearance holes left by omitted pads and traces. The solver clears preserved copper belonging to other nets while same-net copper can overlap. Explicit design cutouts, independent copper, polygon order, and feature ownership remain. The import uses the largest generic source gap on each layer for computed pad, trace, and cutout clearances; it does not reproduce Altium's full object-, room-, and net-class-specific rules. Unfilled polygon outlines are pour intent, so contact regressions compare actual filled source regions rather than assuming that every original outline was conductive. The community SK-AM62 import has incomplete cached fill and generic clearance rules; it is not a complete representation of TI's original constraint setup.

Authored boundaries also exclude copper-restricting Altium region and fill keepouts, expanded by the source gap on that layer. Their actual contours are clipped before Circuit JSON is converted to TSX; the normal converter encodes the resulting holes into `<copperpour outline={...}>`. Feature-owned keepouts select conditional pour outlines in the generated TSX, so omitting a component releases its restriction while board-owned keepouts remain. Via-only keepouts do not remove copper. No geometry is recomputed in the browser.

The converter pin excludes Altium keepout regions from physical copper and reads the legacy copper stack when modern records contain only mechanical layers. The temporary copper-pour-solver override pins shared connectivity, native-geometry cleanup, clearance around drills wider than their nominal pads, and net-aware handling of preserved polygon copper. Core's current version range otherwise selects the older solver; remove the override when that range includes the published fix. The parser and TSX converter use built npm releases with the same source as the previous Git pins; the Altium converter uses its built PR package. Fresh installs do not require manually preparing these Git dependencies.

The same command regenerates `public/board-details` from each full-board Circuit JSON. The detail artifacts are static, and the 3D preview is rendered from the same prebuilt GLB used by the interactive viewer, so the browser does not rerun SVG or 3D rendering.

To regenerate the checked-in Circuit JSON and parameterized TSX from TI's original Altium files:

```sh
bun run generate:ti-evm-references
```

The download step verifies each source archive against its pinned SHA-256 checksum before extraction. The source archives remain untracked. SK-AM62 uses the community Altium conversion for PCB geometry and TI's official Allegro ASCII export for authoritative pad-to-net assignments; the generator rejects missing or inconsistent mappings. It also restores package placement boundaries that the community import incorrectly classified as copper, matching the owning footprint, side, and complete contour to TI's placement metadata. Real unassigned copper remains conductive. The generated project Circuit JSON, component-level TSX, compact reference definitions, and provenance metadata are committed. The Altium parser and both converters are pinned to exact versions.

## Verify

```sh
bun test
bun run typecheck
bun run format:check
bun run build
```

Tests use one focused case per file. They verify catalog provenance, unique option populations, compressed artifact loading, converter cleanup, and routed output for every prebuilt board. Four visual snapshot tests preserve the full-board PCB and schematic SVG, while per-board fidelity tests compare generated TSX against its source Circuit JSON.

## Implementation notes

- `lib/generated/ti-evms/*.source.circuit.json.gz` is the reconciled project-level Circuit JSON produced from each official PCB and all of its electrical schematic sheets.
- `lib/generated/ti-evms/*.circuit.tsx` is component-level tscircuit generated from that Circuit JSON and parameterized by removable feature IDs.
- `scripts/generate-ti-evm-reference-definitions.ts` is the thin entrypoint for the reproducible conversion pipeline. The focused stages under `scripts/ti-evm-reference-generator` own the reference catalog, Altium extraction, pads, teardrops, schematic placement, silkscreen, compatibility lowering, and artifact writing. Generated gzip artifacts use a fixed timestamp so unchanged inputs reproduce byte-for-byte.
- `scripts/parameterize-generated-board.ts` orchestrates the generated-TSX transformation. Its AST traversal and source template live under `scripts/generated-board-source`; together they add feature conditions, filter removed or non-PCB trace endpoints, prevent imported net names from colliding with component selectors, and carry Altium pad/via teardrop intent into core's trace props.
- `lib/ti-evm-catalog.ts` owns the four-board catalog and all selectable variants.
- `scripts/prebuild-ti-evm-assets.ts` renders all 23 curated variants through `@tscircuit/core`; the generated TSX retains the imported Altium routes and prunes routes attached only to omitted subsystems.
- `scripts/prebuild-ti-evm-schematic-assets.ts` applies each variant's component population to the canonical Altium schematic without rerouting or replacing its authored geometry.
- `scripts/prebuild-ti-evm-cad-scenes.ts` upgrades imported primitive CAD bodies only when the source Altium footprint has an unambiguous reusable package model. Known packages receive material-aware geometry, while test pads and assembly markers do not become fake solids. Unknown, ambiguous, and multi-body source geometry is preserved. Every resulting GLB is generated during the prebuild and checked in; the browser never resolves or converts package models.
- `lib/generated/ti-evms/*.component-footprints.json` records the source footprint identity used by the selective CAD enrichment stage. The map is regenerated from the checksum-pinned reference archives rather than maintained by hand.
- `app/hooks/use-evm-render.ts` loads the selected prebuilt PCB and schematic in parallel, ignores stale requests, and reuses the parsed result when a variant is selected again.
- `app/components/DesignViewer.tsx` lazy-loads each viewer, preserves renderer state across variant changes, and starts in Canvas only when the selected board contains geometry unsupported by WebGPU.
- `vercel.json` gives prebuilt Circuit JSON a short browser cache while Vercel automatically edge-caches the static files for each deployment.

## Reference-design notice

The geometry is derived from public Texas Instruments reference material and is provided for evaluation and visualization. Texas Instruments and its marks are the property of Texas Instruments Incorporated. Validate signal integrity, power integrity, thermals, manufacturing outputs, and component availability before fabrication.
