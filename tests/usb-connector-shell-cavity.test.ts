import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import type { Geom3 } from "@jscad/modeling/src/geometries/types"
import { executeCadModelOperation } from "./fixtures/execute-cad-model-operation"
import {
  createMiniUsbConnectorCadModel,
  createUsbAConnectorCadModel,
  createUsbCConnectorCadModel,
} from "../scripts/prebuild-ti-evm-cad-scenes/create-usb-connector-cad-model"

test("USB-A, USB-C and mini-USB shells have an open mouth and a closed roof", () => {
  const connectors = [
    { operations: createUsbAConnectorCadModel(), depth: 15.8, height: 7.1 },
    { operations: createUsbCConnectorCadModel(), depth: 8.8, height: 3.2 },
    { operations: createMiniUsbConnectorCadModel(), depth: 9.2, height: 4 },
  ]
  for (const { operations, depth, height } of connectors) {
    const shell: Geom3 = executeCadModelOperation(operations[0]!)
    const roofProbe = jscad.primitives.cuboid({
      center: [0, -depth * 0.35, height - 0.1],
      size: [0.1, 0.1, 0.1],
    })
    const mouthProbe = jscad.primitives.cuboid({
      center: [0, -depth * 0.45, height * 0.52],
      size: [0.1, 0.1, 0.1],
    })
    expect(
      jscad.measurements.measureVolume(jscad.booleans.intersect(shell, roofProbe)),
    ).toBeCloseTo(0.001, 6)
    expect(
      jscad.measurements.measureVolume(jscad.booleans.intersect(shell, mouthProbe)),
    ).toBeCloseTo(0, 6)
  }
})
