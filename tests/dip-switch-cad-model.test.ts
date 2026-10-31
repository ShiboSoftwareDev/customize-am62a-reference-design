import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { createDipSwitchCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-dip-switch-cad-model"
import { executeCadModelOperation } from "./fixtures/execute-cad-model-operation"

test("DIP banks have independent recessed actuators and solder contacts at the drawing pitch", () => {
  for (const { poleCount, bodyLength, bodyHeight } of [
    { poleCount: 2, bodyLength: 3.66, bodyHeight: 2.3 },
    { poleCount: 4, bodyLength: 6.25, bodyHeight: 2.65 },
    { poleCount: 8, bodyLength: 11.33, bodyHeight: 2.65 },
  ] as const) {
    const operations = createDipSwitchCadModel({ poleCount })
    const solids = operations.map(executeCadModelOperation)
    const model = jscad.booleans.union(...solids)
    const bounds = jscad.measurements.measureBoundingBox(model)
    expect(bounds[0][0]).toBeCloseTo(-bodyLength / 2, 5)
    expect(bounds[1][0]).toBeCloseTo(bodyLength / 2, 5)
    expect(bounds[0][1]).toBeCloseTo(-4.22, 5)
    expect(bounds[1][1]).toBeCloseTo(4.22, 5)
    expect(bounds[0][2]).toBeCloseTo(0, 5)
    expect(bounds[1][2]).toBeCloseTo(bodyHeight, 5)

    for (let poleIndex = 0; poleIndex < poleCount; poleIndex++) {
      const x = (poleIndex - (poleCount - 1) / 2) * 1.27
      const actuatorProbe = jscad.primitives.cuboid({
        center: [x, -0.65, bodyHeight - 0.2],
        size: [0.1, 0.1, 0.1],
      })
      expect(
        jscad.measurements.measureVolume(jscad.booleans.intersect(model, actuatorProbe)),
      ).toBeCloseTo(0.001, 6)
      for (const rowSide of [-1, 1]) {
        const padProbe = jscad.primitives.cuboid({
          center: [x, rowSide * 3.81, 0.1],
          size: [0.1, 0.1, 0.1],
        })
        expect(
          jscad.measurements.measureVolume(jscad.booleans.intersect(model, padProbe)),
        ).toBeCloseTo(0.001, 6)
      }
      const windowProbe = jscad.primitives.cuboid({
        center: [x, 0.9, bodyHeight - 0.05],
        size: [0.1, 0.1, 0.1],
      })
      expect(
        jscad.measurements.measureVolume(jscad.booleans.intersect(model, windowProbe)),
      ).toBeCloseTo(0, 6)
    }
  }
})
