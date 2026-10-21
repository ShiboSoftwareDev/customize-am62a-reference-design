import { expect, test } from "bun:test"
import { parseAllegroPadNetAssignments } from "scripts/ti-evm-reference-generator/parse-allegro-pad-net-assignments"

test("Allegro ASCII node sections preserve pad net assignments", () => {
  const allegroAsciiExport = [
    "A!BOARD_NAME!BOARD_UNITS!",
    "S!example!mils!",
    "A!NET_NAME_SORT!NODE_SORT!NET_NAME!REFDES!PIN_NUMBER!PIN_NAME!SUBCLASS!",
    "J!example.brd!",
    "S!GROUND!2!GND!U1!1!GND!!",
    "S!SIGNAL!2!DATA0!U1!2!D0!!",
    "A!NET_NAME_SORT!NET_NAME!NET_STATUS!",
  ].join("\r\n")

  expect([...parseAllegroPadNetAssignments(allegroAsciiExport).values()]).toEqual([
    { componentName: "U1", netName: "GND", pinName: "1" },
    { componentName: "U1", netName: "DATA0", pinName: "2" },
  ])
})
