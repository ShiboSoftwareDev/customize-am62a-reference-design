import { prebuildStepProductModel } from "./prebuild-step-product-model"

export async function prebuildBeaglePlayConnectorModel(): Promise<void> {
  const referenceUrl =
    "https://raw.githubusercontent.com/beagleboard/beagleplay/7a59a98ae27dc4fd9e2bd8975ff90cdb44a366ea/Design/beagleplayv10_a2_board_3D_20221219.stp"
  const response = await fetch(referenceUrl)
  if (!response.ok) throw new Error(`Failed to download BeaglePlay STEP: ${response.status}`)
  const step = await response.text()
  const productName = "MICRO_SD_ST_TF_003A_16_1X14_5MM"
  await prebuildStepProductModel({
    step,
    productName: "HDMI19P_1D155_23_1X7_7X16_4MM",
    outputName: "beagleplay-hdmi",
  })
  await prebuildStepProductModel({
    step,
    productName,
    outputName: "beagleplay-microsd",
    // The optional removable card is not part of the fitted socket assembly.
    excludedProductNames: ["MicroSD"],
  })
}
