import { test } from "bun:test"
import { expectMinimalBootConfiguration } from "./fixtures/expect-minimal-boot-configuration"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("BeagleBone Black variants preserve electrical integrity and the Minimal boot path", async () => {
  await expectElectricallyValidVariants({
    evmId: "beaglebone-black",
    requiredComponentNames: ["U5"],
  })
  await expectMinimalBootConfiguration({
    evmId: "beaglebone-black",
    retainedComponents: [
      "P1",
      "P10",
      "J1",
      "S1",
      "S2",
      "S3",
      "U2",
      "U5",
      "U7",
      "U12",
      "U15",
      "R75",
    ],
    omittedComponents: ["P2", "P3", "P4", "P5", "P6", "P8", "P9", "U13"],
    requiredNetMembers: {
      VDD_5V: ["P1", "U2"],
      SYS_5V: ["U2", "U4", "U8", "C34"],
      NetR75_2: ["S2", "R75"],
      MMC0_CLKO: ["P10", "U5"],
      MMC0_CMD: ["P10", "U5"],
      MMC0_DAT0: ["P10", "U5"],
      UART0_TX: ["U5", "U15"],
      UART0_RX: ["U5", "U15"],
      B_UART0_TX: ["U15", "J1"],
      B_UART0_RX: ["U15", "J1"],
    },
  })
}, 120_000)
