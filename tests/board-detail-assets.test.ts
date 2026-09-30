import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { tiEvms } from "lib/ti-evm-catalog"
import { getSchematicAssetFileName } from "lib/schematic-sheet-assets"

test("every EVM detail page has PCB, schematic, 3D, and TSX assets", async () => {
  const repositoryRoot = resolve(import.meta.dir, "..")
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]

  for (const evm of tiEvms) {
    const assetRoot = resolve(repositoryRoot, "public/board-details", evm.id)
    const pcbSvg = await Bun.file(resolve(assetRoot, "pcb.svg")).text()
    const source = await Bun.file(resolve(assetRoot, "source.tsx")).text()
    const threeDimensionalPng = new Uint8Array(
      await Bun.file(resolve(assetRoot, "3d.png")).arrayBuffer(),
    )

    expect(pcbSvg).toContain("<svg")
    expect(pcbSvg).toContain("pcb-board")
    for (const [schematicSheetIndex] of evm.schematicSheetLabels.entries()) {
      const schematicSvg = await Bun.file(
        resolve(assetRoot, getSchematicAssetFileName(schematicSheetIndex)),
      ).text()
      expect(schematicSvg).toContain("<svg")
    }
    expect(source).toContain("export default")
    expect(source).toBe(await Bun.file(resolve(repositoryRoot, evm.sourcePath)).text())
    expect([...threeDimensionalPng.slice(0, 8)]).toEqual(pngSignature)
    expect(threeDimensionalPng.byteLength).toBeGreaterThan(10_000)
  }
})
