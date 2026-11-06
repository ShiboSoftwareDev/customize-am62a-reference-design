import { test } from "bun:test"
import { expectMinimalBootConfiguration } from "./fixtures/expect-minimal-boot-configuration"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("BeaglePlay variants preserve electrical integrity and the Minimal boot path", async () => {
  await expectElectricallyValidVariants({
    evmId: "beagleplay",
    requiredComponentNames: ["U1"],
  })
  await expectMinimalBootConfiguration({
    evmId: "beagleplay",
    retainedComponents: [
      "J1",
      "J6",
      "J14",
      "U1",
      "U2",
      "U10",
      "U17",
      "U20",
      "U21",
      "SW1",
      "SW2",
      "SW3",
    ],
    omittedComponents: ["U3", "J13"],
    requiredNetMembers: {
      VSYS_5V: ["J14", "U17"],
      PWR_BTN: ["SW1", "U17"],
      MCU_PORZ: ["SW2", "U1"],
      USER_BTN: ["SW3", "R168"],
      SD_PWR_EN: ["U1", "D50"],
      VDD_3V3_SD: ["U21", "J1"],
      SD_CMD: ["U1", "J1"],
      SD_CLK: ["R80", "J1"],
      UART0_TXD: ["U1", "U10"],
      UART0_RXD: ["U1", "U10"],
      DEBUG_TXD: ["U10", "J6"],
      DEBUG_RXD: ["U10", "J6"],
    },
  })
}, 120_000)
