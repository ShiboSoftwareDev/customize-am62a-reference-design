import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { createJaeHdmiConnectorCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-hdmi-connector-cad-model"
import { executeCadModelOperation } from "./fixtures/execute-cad-model-operation"

test("JAE HDMI signal tails clear the metal shell", () => {
  const operations = createJaeHdmiConnectorCadModel()
  const shell = executeCadModelOperation(operations[0]!)
  // The 19 solder tails follow the shell, tongue and 19 mating contacts.
  const solderTails = operations.slice(21, 40).map(executeCadModelOperation)
  expect(solderTails).toHaveLength(19)
  for (const tail of solderTails) {
    const overlap = jscad.booleans.intersect(shell, tail)
    expect(jscad.measurements.measureVolume(overlap)).toBeCloseTo(0, 6)
  }
})
