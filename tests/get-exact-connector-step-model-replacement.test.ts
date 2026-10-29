import { expect, test } from "bun:test"
import { externalStepModelUrls } from "../scripts/prebuild-ti-evm-cad-scenes/external-step-model-urls"
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
    },
    {
      altiumFootprint: "HDR_2X10_FTR-110-51-D-06_S_S_8-7",
      componentName: "J17",
      modelStepUrl: externalStepModelUrls.pinHeader2x10P1_27Smd,
    },
  ] as const

  for (const connectorCase of connectorCases) {
    expect(
      getCadModelReplacement({
        altiumFootprint: connectorCase.altiumFootprint,
        componentName: connectorCase.componentName,
      }),
    ).toEqual({
      kind: "step",
      modelStepUrl: connectorCase.modelStepUrl,
    })
  }
})
