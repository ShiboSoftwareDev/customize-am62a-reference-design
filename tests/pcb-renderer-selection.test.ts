import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getPcbRenderer } from "app/get-pcb-renderer"

test("PCB rendering starts in canvas only when WebGPU cannot preserve the geometry", () => {
  const board = [{ type: "pcb_board", pcb_board_id: "board", center: { x: 0, y: 0 } }]
  const fabricationDimension = [
    {
      type: "pcb_fabrication_note_dimension",
      pcb_fabrication_note_dimension_id: "dimension",
    },
  ]
  const interpolatedTrace = [
    {
      type: "pcb_trace",
      pcb_trace_id: "trace",
      route_thickness_mode: "interpolated",
      route: [],
    },
  ]
  const throughPadTrace = [
    {
      type: "pcb_trace",
      pcb_trace_id: "trace",
      route: [{ route_type: "through_pad" }],
    },
  ]

  expect(getPcbRenderer(board as AnyCircuitElement[])).toBe("webgpu")
  expect(getPcbRenderer(fabricationDimension as AnyCircuitElement[])).toBe("webgpu")
  expect(getPcbRenderer(interpolatedTrace as AnyCircuitElement[])).toBe("canvas")
  expect(getPcbRenderer(throughPadTrace as AnyCircuitElement[])).toBe("canvas")
})
