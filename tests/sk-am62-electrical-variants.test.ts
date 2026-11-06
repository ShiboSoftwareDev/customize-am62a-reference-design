import { test } from "bun:test"
import { expectMinimalBootConfiguration } from "./fixtures/expect-minimal-boot-configuration"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("SK-AM62 variants preserve electrical integrity and the Minimal boot path", async () => {
  await expectElectricallyValidVariants({
    evmId: "sk-am62",
    requiredComponentNames: ["U12"],
  })
  await expectMinimalBootConfiguration({
    evmId: "sk-am62",
    retainedComponents: [
      "J11",
      "J15",
      "J20",
      "U12",
      "U13",
      "U26",
      "U29",
      "U46",
      "U68",
      "U94",
      "SW1",
      "SW2",
      "R66",
      "R333",
      "R585",
      "Y1",
      "Y4",
      "RA1",
      "RA2",
    ],
    omittedComponents: ["U9", "U28", "J7", "J13"],
    requiredNetMembers: {
      VBUS_TYPEC1: ["J11", "U68"],
      TEST_POWERDOWN: ["R585", "R534"],
      VCC3V3_TA: ["U94", "R585"],
      SYS_BOOTMODE0: ["SW1", "U75"],
      SYS_BOOTMODE8: ["SW2", "U73"],
      PR0_PRU0_GPO0: ["U12", "R518"],
      PR0_PRU0_GPO1: ["U12", "R516"],
      MMC1_CMD: ["U12", "J20"],
      MMC1_CLK: ["R66", "R333", "J20"],
      MMC1_CLK_R: ["U12", "R66"],
      VDD_MMC1_SD: ["FL8", "J20"],
      FT4232_USB_DP: ["J15", "U46"],
      FT4232_SOC_UART0_TX_3V3: ["U46", "U93"],
      SOC_UART0_TX_3V3: ["U12", "U93"],
      SOC_UART0_RX_3V3: ["U12", "U93"],
      WKUP_LFOSCO_XI: ["U12", "C75", "Y1"],
      MCU_OSC0_XI: ["U12", "R358"],
    },
  })
}, 240_000)
