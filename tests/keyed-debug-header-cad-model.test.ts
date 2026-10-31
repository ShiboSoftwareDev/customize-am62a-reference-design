import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"
import { executeCadModelOperation } from "./fixtures/execute-cad-model-operation"

test("Samtec debug headers omit pin 6 and retain the other nineteen contacts", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "HDR_2X10_FTR-110-51-D-06_S_S_8-7",
    componentName: "J17",
  })
  if (replacement?.kind !== "jscad") throw new Error("Expected the keyed Samtec model")
  const bodies = replacement.jscadOperations.map(executeCadModelOperation)
  const bounds = jscad.measurements.measureAggregateBoundingBox(bodies)
  expect(bounds[0][2]).toBeCloseTo(0, 6)
  expect(bounds[1][2]).toBeCloseTo(1.3 + 2.54 + 4.83, 6)
  for (let contactIndex = 0; contactIndex < 20; contactIndex++) {
    const pinNumber = contactIndex + 1
    const probe = jscad.primitives.cuboid({
      center: [(Math.floor(contactIndex / 2) - 4.5) * 1.27, pinNumber % 2 === 1 ? -1.27 : 1.27, 4],
      size: [0.1, 0.1, 0.1],
    })
    const pinVolume = bodies.reduce(
      (volume, body) =>
        volume + jscad.measurements.measureVolume(jscad.booleans.intersect(body, probe)),
      0,
    )
    expect(pinVolume).toBeCloseTo(pinNumber === 6 ? 0 : 0.001, 6)
  }
})
