# TI BoosterPack configurator

An instant configurator for real boards from the
[`tscircuit/boosters`](https://github.com/tscircuit/boosters) repository. The app
offers five BoosterPacks and a board-specific set of meaningful circuit configurations.
Both the PCB and schematic viewers consume the selected configuration's complete
Circuit JSON.

## Included boards

- BOOSTXL-EDUMKII: 8 learning, sensing, interface, audio, output, and robotics builds
- BOOST-DRV8848: 4 useful power/fault-indicator combinations
- BOOSTXL-BASSENSORS: all 15 non-empty combinations of its 4 independent sensors
- BOOSTXL-AUDIO: 4 full, playback, and headset signal-path builds
- BOOSTXL-CC2650MA: 6 development, debug, flash, status, and production builds

The app links every board to its upstream TSX and links the complete BoosterPack
source repository. It does not present a separate catalog or gallery.

## Prebuilt configurations

The 37 configurations are rendered from a pinned `tscircuit/boosters` commit by
[`scripts/prebuild-boosterpack-configurations.tsx`](./scripts/prebuild-boosterpack-configurations.tsx).
The script filters optional blocks from the React circuit tree before
`@tscircuit/core` performs schematic layout and PCB autorouting. It then stores
gzip-compressed Circuit JSON in `public/prebuilt-boosterpacks`.

There is no fixed per-board quota: configurations follow the independent functional
blocks and valid signal paths of each design. Local Vite and the Vercel deployment
serve exactly the same static files, so switching boards or configurations requires
no cloud function and no runtime circuit render. To regenerate them after changing
the pinned source or configuration definitions:

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
