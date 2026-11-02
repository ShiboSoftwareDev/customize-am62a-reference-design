import { expect, test } from "bun:test"
import { getSchematicPoint, parseAltiumSchDoc } from "altiumts"
import { fitSchematicImagesToSheet } from "../scripts/ti-evm-reference-generator/fit-schematic-images-to-sheet"
import { getCustomSchematicSheetSize } from "../scripts/ti-evm-reference-generator/get-custom-schematic-sheet-size"

test("fits the complete BeaglePlay power-tree image on its paper without resizing it", async () => {
  const document = parseAltiumSchDoc(
    await Bun.file(new URL("fixtures/beagleplay-power-tree.SchDoc", import.meta.url)).bytes(),
  )
  const image = document.records.find((record) => record.type === "schematic-image-record")
  if (!image) throw new Error("Missing BeaglePlay power-tree image")
  const sheetSize = getCustomSchematicSheetSize(document)
  const originalLocation = getSchematicPoint(image, { xKey: "LOCATION.X", yKey: "LOCATION.Y" })
  const originalCorner = getSchematicPoint(image, { xKey: "CORNER.X", yKey: "CORNER.Y" })
  if (!sheetSize || !originalLocation || !originalCorner) throw new Error("Missing image bounds")
  expect(originalCorner.y).toBeGreaterThan(sheetSize.height)
  const otherRecords = document.records.filter((record) => record !== image)
  const originalOtherRecords = otherRecords.map((record) => record.getString())
  const originalImagePayloads = document.embeddedImages.map((embeddedImage) =>
    embeddedImage.getCompressedBytes().slice(),
  )

  fitSchematicImagesToSheet(document)

  const location = getSchematicPoint(image, { xKey: "LOCATION.X", yKey: "LOCATION.Y" })
  const corner = getSchematicPoint(image, { xKey: "CORNER.X", yKey: "CORNER.Y" })
  if (!location || !corner) throw new Error("Missing corrected image bounds")
  expect(location.x).toBeGreaterThanOrEqual(0)
  expect(location.y).toBeGreaterThanOrEqual(0)
  expect(corner.x).toBeLessThanOrEqual(sheetSize.width)
  expect(corner.y).toBeLessThanOrEqual(sheetSize.height)
  expect(corner.x - location.x).toBeCloseTo(originalCorner.x - originalLocation.x, 5)
  expect(corner.y - location.y).toBeCloseTo(originalCorner.y - originalLocation.y, 5)
  expect(otherRecords.map((record) => record.getString())).toEqual(originalOtherRecords)
  expect(
    document.embeddedImages.map((embeddedImage) => embeddedImage.getCompressedBytes()),
  ).toEqual(originalImagePayloads)
  const fittedImage = image.getString()
  fitSchematicImagesToSheet(document)
  expect(image.getString()).toBe(fittedImage)
})
