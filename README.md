# TI BoosterPack configurator

An instant configurator for real boards from the
[`tscircuit/boosters`](https://github.com/tscircuit/boosters) repository. The app
offers five BoosterPacks with removable-subsystem checkboxes. Every possible checkbox
combination is prebuilt, including the full board and the minimal board containing
only required circuitry. Both viewers consume the selected build's complete Circuit JSON.

## Included boards

- BOOSTXL-EDUMKII: 7 removable blocks, 128 combinations
- BOOST-DRV8848: 2 removable indicators, 4 combinations
- BOOSTXL-BASSENSORS: 4 removable sensors, 16 combinations
- BOOSTXL-AUDIO: 5 removable audio blocks, 32 combinations
- BOOSTXL-CC2650MA: 5 removable debug, flash, routing, status, and test blocks, 32 combinations

The app links every board to its upstream TSX and links the complete BoosterPack
source repository. It does not present a separate catalog or gallery.

## Prebuilt configurations

The 212 configurations are generated from a pinned `tscircuit/boosters` commit by
[`scripts/prebuild-boosterpack-configurations.tsx`](./scripts/prebuild-boosterpack-configurations.tsx).
The script renders each complete TSX board once, then removes each selected block and
all of its source-linked schematic, PCB, trace, and CAD elements for every powerset
combination. It stores the results as gzip-compressed Circuit JSON in
`public/prebuilt-boosterpacks`.

Local Vite and the Vercel deployment serve exactly the same static files, so checking
or unchecking a block requires no cloud function and no runtime circuit render. To
regenerate every combination after changing the pinned source or feature definitions:

```sh
bun run prebuild:boosters
```

## Run locally

```sh
bun install
bun run dev
```

Open the printed local URL. Board changes should load from static assets in well
under a second on a local connection.

## Verify

```sh
bun test
bun run typecheck
bun run format:check
bun run build
```

Authored files follow the tscircuit handbook conventions, including named parameter
objects and focused one-test-per-file coverage.

## Deployment

The repository is a static Vite deployment. Vercel publishes the committed
prebuilt Circuit JSON alongside the frontend; it does not render tscircuit TSX in
a request-time server function.

## Design notice

These boards are open-source tscircuit reconstructions of TI BoosterPack designs.
Validate the selected circuit, signal integrity, power integrity, thermals,
manufacturing outputs, and component availability before fabrication. Texas
Instruments and its marks are the property of Texas Instruments Incorporated.
