import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import {
  createMiniUsbConnectorCadModel,
  createUsbAConnectorCadModel,
  createUsbCConnectorCadModel,
} from "../scripts/prebuild-ti-evm-cad-scenes/create-usb-connector-cad-model"
import { executeCadModelOperation } from "./fixtures/execute-cad-model-operation"

test("USB rear insulators sit inside the cavity without overlapping the exterior shell face", () => {
  const connectors = [
    createUsbAConnectorCadModel(),
    createUsbCConnectorCadModel(),
    createMiniUsbConnectorCadModel(),
  ]
  for (const operations of connectors) {
    const shell = executeCadModelOperation(operations[0]!)
    const rearInsulator = executeCadModelOperation(operations[2]!)
    const [, shellMax] = jscad.measurements.measureBoundingBox(shell)
    const [, rearInsulatorMax] = jscad.measurements.measureBoundingBox(rearInsulator)

    expect(rearInsulatorMax[1]).toBeLessThan(shellMax[1] - 0.1)
    expect(
      jscad.measurements.measureVolume(jscad.booleans.subtract(rearInsulator, shell)),
    ).toBeGreaterThan(0.001)
    expect(
      jscad.measurements.measureVolume(jscad.booleans.intersect(rearInsulator, shell)),
    ).toBeGreaterThan(0.001)
  }
})
