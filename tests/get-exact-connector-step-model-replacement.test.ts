import { expect, test } from "bun:test"
import { externalStepModelUrls } from "../scripts/prebuild-ti-evm-cad-scenes/external-cad-model-urls"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("uses exact STEP geometry for recognized Sitara connectors", () => {
  const connectorCases = [
    {
      altiumFootprint: "CON_19X1_10029449-001RLF_S_R_S_6-3",
      componentName: "J5",
      modelStepUrl: externalStepModelUrls.amphenolHdmiA,
    },
    {
      altiumFootprint: "CON_HDMI19_DC04S019JA1R600_S_R_S_6-3",
      componentName: "J13",
      modelStepUrl: externalStepModelUrls.amphenolHdmiA,
    },
    {
      altiumFootprint: "CON_AV4_SJ-43514-SMT_S_R_S_5-1",
      componentName: "J12",
      modelStepUrl: externalStepModelUrls.cuiSj43514AudioJack,
    },
    {
      altiumFootprint: "CONN19_HDMI",
      componentName: "P6",
      modelStepUrl: externalStepModelUrls.molexMicroHdmiD,
    },
    {
      altiumFootprint: "HDR_2X10_PREC010DAAN_S_T_8-4",
      componentName: "J10",
      modelStepUrl: externalStepModelUrls.pinHeader2x10P2_54ThroughHole,
      modelPlanarOffsetMillimeters: { x: -1.27, y: 11.43 },
      modelYawOffsetDegrees: 90,
    },
    {
      altiumFootprint: "HEADER10X2_SMD",
      componentName: "P2",
      modelStepUrl: externalStepModelUrls.pinHeader2x10P1_27Smd,
      modelYawOffsetDegrees: 90,
    },
    {
      altiumFootprint: "HDR_2X5_54202-T0805ALF_P_S_S_9-9",
      componentName: "J11",
      modelStepUrl: externalStepModelUrls.pinHeader2x05P2_54Smd,
      modelYawOffsetDegrees: 90,
    },
    {
      altiumFootprint: "HDR_1X4_TSM-104-02-SV_S_S_12-4",
      componentName: "J6",
      modelStepUrl: externalStepModelUrls.pinHeader1x04P2_54Smd,
      modelYawOffsetDegrees: -90,
    },
  ] as const

  for (const { altiumFootprint, componentName, ...expectedModel } of connectorCases) {
    expect(
      getCadModelReplacement({
        altiumFootprint,
        componentName,
      }),
    ).toEqual({
      kind: "step",
      ...expectedModel,
    })
  }
})
