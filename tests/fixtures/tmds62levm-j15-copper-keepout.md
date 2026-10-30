The mounting peg and its keepout are extracted from J15 on TI's TMDS62LEVM
`PROC181E1-1_BRD_11_3.pcbdoc`, from the checksum-pinned reference archive listed
in `scripts/ti-evm-reference-generator/references.ts`.

The fixture retains the original peg dimensions and region contour (source
record 130035). Both are translated to place the peg at the origin, preserving
their relative position. The keepout's restriction mask is 6: track and copper,
on all copper layers. The component index is remapped to 0. The cropped two-layer
board and surrounding GND polygons isolate the repour behavior without the
rest of the evaluation board. The 4 mil clearance is the source's generic
top/bottom gap.

The tests run the fixture through the normal Altium converter, parameterized
TSX generator, and Core renderer. With J15 populated, its keepout remains
clear. With the USB feature omitted, that copper restriction disappears.
