import { boosterPackBoards } from "../lib/boosterpack-configurations"
import { renderBoosterPackConfiguration } from "./render-boosterpack-configuration"

const [, , boardId, configurationId, outputDirectory] = process.argv
if (!boardId || !configurationId || !outputDirectory) {
  throw new Error("Expected board ID, configuration ID, and output directory")
}

const board = boosterPackBoards.find(({ id }) => id === boardId)
if (!board) throw new Error(`Unknown BoosterPack board: ${boardId}`)

const configuration = board.configurations.find(({ id }) => id === configurationId)
if (!configuration) throw new Error(`Unknown BoosterPack configuration: ${configurationId}`)

const result = await renderBoosterPackConfiguration({
  board,
  configuration,
  outputDirectory,
})
console.log(JSON.stringify(result))
