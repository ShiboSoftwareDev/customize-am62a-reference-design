import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("omits the SK-AM62 BGA assembly envelope from the populated CAD scene", () => {
  expect(
    getCadModelReplacement({
      altiumFootprint: "BGASKT425_C21135_720X720_9-7",
      componentName: "BGASKT425_C21135_720X720_9-7",
    }),
  ).toEqual({ kind: "none" })
})
