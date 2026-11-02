# Reference connector models

`beagleplay-hdmi.glb` contains the `HDMI19P_1D155_23_1X7_7X16_4MM` product from BeagleBoard’s [official BeaglePlay STEP release](https://github.com/beagleboard/beagleplay/blob/7a59a98ae27dc4fd9e2bd8975ff90cdb44a366ea/Design/beagleplayv10_a2_board_3D_20221219.stp). The original BREP, assembly placement, and materials are retained. This is the narrow through-hole HDMI connector used by J4, rather than the horizontal surface-mount Amphenol connector used by SK-AM62.

Regenerate it with `bun scripts/prebuild-beagleplay-connector-model.ts`, then run `bun run prebuild:ti-evm-cad-scenes`. The script downloads the pinned release, extracts this product and its child assembly, and uses `circuit-json-to-gltf` to tessellate it. Temporary STEP sources stay under `tmp/`.

The generated asset uses the exporter’s scene coordinates. Its enrichment mapping restores the package frame and registers the 19 numbered contacts against the imported plated holes. The cached scene tests verify that all 19 leads cross the PCB at their own hole centers.

The dimensioned FPC models use the following package references:

- [TE 1-1734248-5](https://www.te.com/en/product-1-1734248-5.html): vertical, 15 positions at 1 mm, 22.4 × 4.6 × 7.7 mm.
- [GCT FFC2A32](https://gct.co/connector/ffc2a32): vertical, 40 positions at 0.5 mm, 4.25 mm profile; the 40-position housing is 27.4 × 3.3 mm.
- [Molex 5019512230](https://www.molex.com/en-us/products/part-detail/5019512230): vertical V-Flip, 22 positions at 0.5 mm, 4.05 mm profile.
- [Hirose FH12A-40S-0.5SH(55)](https://www.hirose.com/en/product/p/CL0586-0557-8-55): horizontal top-contact, 24.5 × 7 × 2 mm.
- BeaglePlay's 0.5K-DX-40PWB and 0.5K-DX-22PWB use the 25.4 × 5.25 × 2 mm and 15.4 × 5.25 × 2 mm bodies recorded in its official Altium footprint names and BOM.

These are dimensioned JSCAD representations with simplified housings and spring contacts. Solder tails follow every imported SMT land in the package's local frame, including mounting tabs and the TE part's paired A/B tails. They are not tessellations of manufacturer STEP models. Only the prebuilt GLB scenes include this enrichment; electrical and PCB/schematic artifacts are unchanged.

The microSD representation keeps a simplified hollow shell and eight internal mating contacts, rather than drawing contacts on the lid. Signal, card-detect and mounting tails follow the imported SMT lands, including the socket's package-axis offset on BeaglePlay. The shell is an illustration, not an exact manufacturer model; [GCT's MEM2051 drawing](https://www.farnell.com/cad/2343030.pdf) distinguishes internal mating contacts from the PCB solder areas.

Symmetric chip passives align their long axis through the imported land centers. Crystal package heights, when present in the footprint name, include the substrate rather than being added above it.
