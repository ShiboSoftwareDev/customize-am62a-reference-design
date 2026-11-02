import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import {
  createMiniUsbConnectorCadModel,
  createUsbAConnectorCadModel,
  createUsbCConnectorCadModel,
} from "../scripts/prebuild-ti-evm-cad-scenes/create-usb-connector-cad-model"
import { executeCadModelOperation } from "./fixtures/execute-cad-model-operation"

test("USB contacts stay recessed in the shell and supported by the tongue", () => {
  const connectors = [
    { operations: createUsbAConnectorCadModel(), contactCount: 4 },
    { operations: createUsbCConnectorCadModel(), contactCount: 16 },
    { operations: createMiniUsbConnectorCadModel(), contactCount: 5 },
  ]
  for (const { operations, contactCount } of connectors) {
    const shell = executeCadModelOperation(operations[0]!)
    const tongue = executeCadModelOperation(operations[1]!)
    const [shellMin] = jscad.measurements.measureBoundingBox(shell)
    const [tongueMin, tongueMax] = jscad.measurements.measureBoundingBox(tongue)
    for (const operation of operations.slice(3, 3 + contactCount)) {
      const contact = executeCadModelOperation(operation)
      const [contactMin, contactMax] = jscad.measurements.measureBoundingBox(contact)
      expect(contactMin[1]).toBeGreaterThan(shellMin[1])
      expect(contactMin[1]).toBeGreaterThan(tongueMin[1])
      expect(contactMax[1]).toBeLessThan(tongueMax[1])
      const projectedContact = jscad.transforms.translateZ(
        (tongueMin[2] + tongueMax[2] - contactMin[2] - contactMax[2]) / 2,
        contact,
      )
      const unsupportedContact = jscad.booleans.subtract(projectedContact, tongue)
      expect(jscad.measurements.measureVolume(unsupportedContact)).toBeCloseTo(0, 6)
    }
  }
})
