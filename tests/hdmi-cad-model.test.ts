import { expect, test } from "bun:test"
import { createHdmiAConnectorCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-hdmi-connector-cad-model"

test("builds a tapered HDMI shell with a recessed opening", () => {
  const hdmiModel = createHdmiAConnectorCadModel()

  expect(hdmiModel).toHaveLength(22)
  expect(hdmiModel[0]).toMatchObject({
    type: "colorize",
    shape: {
      type: "subtract",
      shapes: [
        { type: "translate", shape: { type: "rotateX" } },
        { type: "translate", shape: { type: "rotateX" } },
      ],
    },
  })
})
