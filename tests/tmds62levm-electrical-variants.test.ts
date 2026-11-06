import { test } from "bun:test"
import { expectMinimalBootConfiguration } from "./fixtures/expect-minimal-boot-configuration"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("TMDS62LEVM variants preserve electrical integrity and the Minimal boot path", async () => {
  await expectElectricallyValidVariants({
    evmId: "tmds62levm",
    requiredComponentNames: ["U28"],
  })
  await expectMinimalBootConfiguration({
    evmId: "tmds62levm",
    retainedComponents: [
      "J7",
      "J12",
      "J14",
      "J17",
      "U5",
      "U28",
      "U29",
      "U48",
      "U49",
      "U50",
      "U104",
      "U125",
      "SW2",
      "SW3",
      "SW4",
      "R120",
      "R449",
    ],
    omittedComponents: ["U34", "U35", "U42", "J15", "J19"],
    requiredNetMembers: {
      VBUS_TYPEC1: ["J17", "U125"],
      NetR140_1: ["R449", "U58"],
      REG_EN: ["U58", "U132"],
      LPDDR4_DQS0_P: ["U28", "U29"],
      MMC1_CMD: ["U28", "J12"],
      MMC1_CLK: ["R120", "J12"],
      MMC1_CLK_R: ["U28", "R120"],
      VDD_MMC1_SD: ["U104", "J12"],
      FT4232_USB_DP: ["J7", "U5"],
      FT4232_USB_DM: ["J7", "U5"],
      NetU5_38: ["U5", "U70"],
      NetU28_W22: ["U28", "U70"],
    },
  })
}, 240_000)
