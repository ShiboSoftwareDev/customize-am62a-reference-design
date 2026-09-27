import { readFile } from "node:fs/promises"
import type { BoardRenderRequest } from "../api-types"
import { deriveModuleFlags } from "../module-config"

const selectedBoardPattern = /export default function SelectedBoard\(\)[\s\S]*$/

export async function getBoardSource(request: BoardRenderRequest): Promise<string> {
  const sourcePath = new URL("../generated/am62a-board.tsx", import.meta.url)
  const source = await readFile(sourcePath, "utf8")
  const flags = deriveModuleFlags(request.selection)
  flags.addPours = request.addPours
  flags.renderSchematic = true
  const selectedBoard = `export default function SelectedBoard() { return <AM62ABoard flags={${JSON.stringify(flags, null, 2)}} /> }\n`

  return source.replace(selectedBoardPattern, selectedBoard)
}
