This crop comes from the TI SK-AM62 PROC114E3 Altium reference, converted with altium-to-circuit-json 0.0.114. It retains the native FB1, C204 and U7 records, local VCC_3V3_SYS polygon 68, via 174969, and its three incident routes. Coordinates, pad shapes, net assignments and the polygon boundary are unchanged; source traces are restricted to the included ports and the board viewport is cropped.

FB1 and C204 belong to the removable multimedia feature. Both have VCC_3V3_SYS pads inside the bottom pour. C204's DGND pad is also inside the boundary, separated by clearance. That unrelated pad must not prevent the pour from being removed with multimedia. Otherwise the unfilled source boundary anchors two route stubs even though the prebuilt, recomputed pour no longer contains copper there.

Reference: https://www.ti.com/tool/SK-AM62
