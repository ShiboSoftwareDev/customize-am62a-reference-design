import { expect, test } from "bun:test"
import { allOptionalModules } from "lib/module-config"
import { evaluateBoard } from "lib/server/evaluate-board"

test("renders every optional module within the interactive path", async () => {
  const result = await evaluateBoard({
    selection: allOptionalModules,
    addPours: false,
  })

  expect(result.circuitJson.filter((element) => element.type.includes("error"))).toHaveLength(0)
  expect(result.circuitJson.filter((element) => element.type === "pcb_trace")).toHaveLength(5009)
  expect(result.circuitJson.filter((element) => element.type === "schematic_group")).toHaveLength(
    95,
  )
}, 90_000)
