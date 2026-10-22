import { expect, test } from "bun:test"
import { getSelectedSchematicSheet } from "app/components/get-selected-schematic-sheet"

test("keeps the selected schematic sheet when the next variant includes it", () => {
  expect(
    getSelectedSchematicSheet({
      requestedLabel: "03.SchDoc",
      labels: ["01.SchDoc", "03.SchDoc", "04.SchDoc"],
    }),
  ).toEqual({ index: 1, label: "03.SchDoc" })
})

test("selects the first sheet when the requested sheet is unavailable", () => {
  expect(
    getSelectedSchematicSheet({
      requestedLabel: "02.SchDoc",
      labels: ["01.SchDoc", "03.SchDoc", "04.SchDoc"],
    }),
  ).toEqual({ index: 0, label: "01.SchDoc" })
})
