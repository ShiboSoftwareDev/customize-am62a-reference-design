import { expect, test } from "bun:test"
import { minimalOptionalModules } from "lib/module-config"
import { evaluateBoard } from "lib/server/evaluate-board"

test("renders and validates the minimal 12-layer board", async () => {
  const result = await evaluateBoard(
    {
      selection: minimalOptionalModules,
      addPours: false,
    },
    { runDrcChecks: true },
  )

  expect(
    result.circuitJson.some(
      (element) => element.type === "source_failed_to_create_component_error",
    ),
  ).toBe(false)
  expect(result.circuitJson.filter((element) => element.type.includes("error"))).toHaveLength(2)
  expect(
    result.circuitJson
      .filter((element) => element.type.includes("error"))
      .every((element) => element.type === "pcb_pad_pad_clearance_error"),
  ).toBe(true)
  expect(result.circuitJson.filter((element) => element.type === "pcb_trace").length).toBe(2249)
  expect(result.circuitJson.filter((element) => element.type === "schematic_group").length).toBe(27)
}, 30_000)
