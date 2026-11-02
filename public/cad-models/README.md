# Reference connector models

`beagleplay-hdmi.glb` contains the `HDMI19P_1D155_23_1X7_7X16_4MM` product from BeagleBoard’s [official BeaglePlay STEP release](https://github.com/beagleboard/beagleplay/blob/7a59a98ae27dc4fd9e2bd8975ff90cdb44a366ea/Design/beagleplayv10_a2_board_3D_20221219.stp). The original BREP, assembly placement, and materials are retained. This is the narrow through-hole HDMI connector used by J4, rather than the horizontal surface-mount Amphenol connector used by SK-AM62.

Regenerate it with `bun scripts/prebuild-beagleplay-connector-model.ts`, then run `bun run prebuild:ti-evm-cad-scenes`. The script downloads the pinned release, extracts this product and its child assembly, and uses `circuit-json-to-gltf` to tessellate it. Temporary STEP sources stay under `tmp/`.

The generated asset uses the exporter’s scene coordinates. Its enrichment mapping restores the package frame and registers the 19 numbered contacts against the imported plated holes. The cached scene tests verify that all 19 leads cross the PCB at their own hole centers.
