import { expect, test } from "bun:test"
import { createHdmiAConnectorCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-hdmi-connector-cad-model"

test("builds the HDMI shell from renderable solid walls", () => {
  const hdmiModel = createHdmiAConnectorCadModel()

  expect(hdmiModel).toHaveLength(25)
  for (const shellWall of hdmiModel.slice(0, 5)) {
    expect(shellWall).toMatchObject({
      type: "colorize",
      shape: {
        type: "translate",
        shape: { type: "cuboid" },
      },
    })
  }
})
