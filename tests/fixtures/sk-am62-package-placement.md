The crop retains all 425 U12 pads and the original top/bottom rectangular region
contours from the community Altium import of TI's SK-AM62 PROC114E3 board. The
component index and pad net indices are remapped into the cropped document.
The two offending regions belong to the colocated
BGASKT425_C21135_720X720_9-7 package's placement outline.

The accompanying Allegro ASCII rows come from TI's official PROC114E3_BRD.alg
and identify those exact contours as PACKAGE GEOMETRY / PLACE_BOUND_TOP and
PLACE_BOUND_BOTTOM. Coordinates remain in board space, in mils. The original
mechanical layer names and IDs are retained. A real unassigned custom pin shape
from U77 is included as a negative control; it must remain copper.

Both archives and checksums are listed in
scripts/ti-evm-reference-generator/references.ts. Reconciliation matches the
owning footprint, side, and complete boundary at the export's 0.01 mil precision;
it does not infer placement boundaries from size, netlessness, or pad overlap.
