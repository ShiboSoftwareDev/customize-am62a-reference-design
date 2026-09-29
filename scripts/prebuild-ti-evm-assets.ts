import { mkdir, writeFile } from "node:fs/promises"
import { basename, resolve } from "node:path"
import { parseAltiumBinaryPcbDoc, parseAltiumSchDoc } from "altiumts"
import {
  convertAltiumPcbDocToCircuitJson,
  convertAltiumSchDocToCircuitJson,
} from "altium-to-circuit-json"
import type { AnyCircuitElement } from "circuit-json"
import { any_circuit_element } from "circuit-json"
import { gzipSync, strToU8, unzipSync } from "fflate"
import { evaluateBoard } from "../lib/server/evaluate-board"
import { tiEvms } from "../lib/ti-evm-catalog"

const outputDirectory = resolve(import.meta.dir, "../public/prebuilt-ti-evms")
const cacheDirectory = resolve(import.meta.dir, "../.cache/ti-evm-sources")

type ManifestArtifact = {
  elementCount: number
  output: string
  source: string
}

type ManifestBoard = {
  id: string
  artifacts: ManifestArtifact[]
}

const manifest: {
  boards: ManifestBoard[]
  sources: Array<{ name: string; sha256: string; url: string }>
} = {
  boards: [],
  sources: [],
}

export async function prebuildTiEvmAssets(): Promise<void> {
  await mkdir(outputDirectory, { recursive: true })
  await mkdir(cacheDirectory, { recursive: true })

  await prebuildSkAm62aVariants()
  await prebuildTmds62lEvm()
  await prebuildAm62lEvseEvm()
  await writeFile(
    resolve(outputDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )

  console.log(`Prebuilt ${manifest.boards.length} TI EVMs in ${outputDirectory}`)
}

async function prebuildSkAm62aVariants(): Promise<void> {
  const evm = tiEvms.find(({ id }) => id === "sk-am62a-lp")
  if (!evm) throw new Error("SK-AM62A-LP is missing from the catalog")
  const artifacts: ManifestArtifact[] = []

  for (const variant of evm.variants) {
    if (!variant.sourceSelection) {
      throw new Error(`${evm.name} ${variant.label} has no TSX selection`)
    }
    const result = await evaluateBoard({
      selection: variant.sourceSelection,
      addPours: false,
    })
    const failedComponents = result.circuitJson.filter(
      ({ type }) => type === "source_failed_to_create_component_error",
    )
    if (failedComponents.length > 0) {
      throw new Error(`${evm.name} ${variant.label} failed to render`)
    }
    artifacts.push(
      await writeCompressedCircuitJson({
        outputPath: variant.pcbCircuitJsonUrl,
        circuitJson: result.circuitJson,
        source: "Parameterized SK-AM62A-LP tscircuit TSX",
        validateWithPublishedSchema: false,
      }),
    )
  }

  manifest.boards.push({ id: evm.id, artifacts })
}

async function prebuildTmds62lEvm(): Promise<void> {
  const source = await downloadVerifiedArchive({
    name: "Texas Instruments SPRCAL9 / TMDS62LEVM Rev. B",
    sha256: "40e6c4d0bea5381bf7b4e0ef26ec4ec9adae156be308e4a3838bd344972b7615",
    url: "https://www.ti.com/lit/zip/sprcal9",
  })
  const archive = unzipSync(source)
  const nestedArchivePath =
    "TMDS62LEVM Design File Package Altium (Rev. B)/PROC180/PROC181E1_1/3_BoardFile/Altium/PROC181E1-1_PRJPCB.zip"
  const nestedArchive = getArchiveEntry(archive, nestedArchivePath)
  const project = unzipSync(nestedArchive)
  const evm = getCatalogEvm("tmds62levm")
  const variant = evm.variants[0]
  const artifacts: ManifestArtifact[] = []
  const pcbSource = getArchiveEntry(project, "PROC181E1-1_BRD_11_3.pcbdoc")
  const pcbCircuitJson = removeOffBoardPcbComponentBounds(
    convertAltiumPcbDocToCircuitJson(parseAltiumBinaryPcbDoc(pcbSource)),
  )

  artifacts.push(
    await writeCompressedCircuitJson({
      outputPath: variant.pcbCircuitJsonUrl,
      circuitJson: pcbCircuitJson,
      source: "SPRCAL9 Rev. B / PROC181E1-1_BRD_11_3.pcbdoc",
    }),
  )

  for (const page of variant.schematicPages ?? []) {
    const schematicSource = getArchiveEntry(project, `${page.id}.SchDoc`)
    const circuitJson = convertAltiumSchDocToCircuitJson(parseAltiumSchDoc(schematicSource), {
      sheetName: `${evm.name} Rev. B — ${page.label}`,
    })
    artifacts.push(
      await writeCompressedCircuitJson({
        outputPath: page.circuitJsonUrl,
        circuitJson,
        source: `SPRCAL9 Rev. B / ${page.id}.SchDoc`,
      }),
    )
  }

  manifest.boards.push({ id: evm.id, artifacts })
}

async function prebuildAm62lEvseEvm(): Promise<void> {
  const source = await downloadVerifiedArchive({
    name: "Texas Instruments SLVMEM2 / AM62L-EVSE-DEV-EVM",
    sha256: "c9b92c2ce9e6262e5118aa0d1a63794866ac56f4a9843197def220d0297751dc",
    url: "https://www.ti.com/lit/zip/SLVMEM2",
  })
  const archive = unzipSync(source)
  const evm = getCatalogEvm("am62l-evse-dev-evm")
  const variant = evm.variants[0]
  const artifacts: ManifestArtifact[] = []
  const pcbSource = getArchiveEntry(archive, "PROC219E1/PROC219E1.PcbDoc")
  const pcbCircuitJson = removeOffBoardPcbComponentBounds(
    convertAltiumPcbDocToCircuitJson(parseAltiumBinaryPcbDoc(pcbSource)),
  )
  const schematicSourceNames = [
    "PROC219_Block_Diagram.SchDoc",
    "PROC219_CAN.SchDoc",
    "PROC219_CHAdeMO.SchDoc",
    "PROC219_Connectors.SchDoc",
    "PROC219_GBT.SchDoc",
    "PROC219_Hardware.SchDoc",
    "PROC219_IO.SchDoc",
    "PROC219_MSPM0.SchDoc",
    "PROC219_Pilot_Interface.SchDoc",
    "PROC219_PLC.SchDoc",
    "PROC219_PluckLock.SchDoc",
    "PROC219_Power_Analog.SchDoc",
    "PROC219_Power_IN_Dig.SchDoc",
    "PROC219_Serial.SchDoc",
    "PROC219_Temp_Sense.SchDoc",
    "PROC219_XDS110_Debug.SchDoc",
  ]

  artifacts.push(
    await writeCompressedCircuitJson({
      outputPath: variant.pcbCircuitJsonUrl,
      circuitJson: pcbCircuitJson,
      source: "SLVMEM2 / PROC219E1.PcbDoc",
    }),
  )

  const schematicPages = variant.schematicPages ?? []
  if (schematicPages.length !== schematicSourceNames.length) {
    throw new Error("AM62L EVSE schematic catalog does not match the TI project")
  }
  for (const [index, page] of schematicPages.entries()) {
    const sourceName = schematicSourceNames[index]
    const schematicSource = getArchiveEntry(archive, `PROC219E1/${sourceName}`)
    const circuitJson = convertAltiumSchDocToCircuitJson(parseAltiumSchDoc(schematicSource), {
      sheetName: `${evm.name} — ${page.label}`,
    })
    artifacts.push(
      await writeCompressedCircuitJson({
        outputPath: page.circuitJsonUrl,
        circuitJson,
        source: `SLVMEM2 / ${sourceName}`,
      }),
    )
  }

  manifest.boards.push({ id: evm.id, artifacts })
}

async function downloadVerifiedArchive(archiveSource: {
  name: string
  sha256: string
  url: string
}): Promise<Uint8Array> {
  const cachePath = resolve(cacheDirectory, `${archiveSource.sha256}.zip`)
  let bytes: Uint8Array
  if (await Bun.file(cachePath).exists()) {
    bytes = new Uint8Array(await Bun.file(cachePath).arrayBuffer())
  } else {
    const response = await fetch(archiveSource.url)
    if (!response.ok) {
      throw new Error(`${archiveSource.url} returned ${response.status} ${response.statusText}`)
    }
    bytes = new Uint8Array(await response.arrayBuffer())
    await writeFile(cachePath, bytes)
  }
  const actualSha256 = new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
  if (actualSha256 !== archiveSource.sha256) {
    throw new Error(`${archiveSource.name} checksum mismatch: ${actualSha256}`)
  }
  manifest.sources.push(archiveSource)
  return bytes
}

function getArchiveEntry(archive: Record<string, Uint8Array>, path: string): Uint8Array {
  const entry = archive[path]
  if (!entry) throw new Error(`Archive is missing ${path}`)
  return entry
}

function getCatalogEvm(id: string) {
  const evm = tiEvms.find((candidate) => candidate.id === id)
  if (!evm) throw new Error(`${id} is missing from the catalog`)
  return evm
}

async function writeCompressedCircuitJson(artifact: {
  outputPath: string
  circuitJson: AnyCircuitElement[]
  source: string
  validateWithPublishedSchema?: boolean
}): Promise<ManifestArtifact> {
  const circuitJson = removeNullProperties(artifact.circuitJson)
  if (artifact.validateWithPublishedSchema ?? true) {
    validateCircuitJson(circuitJson, artifact.source)
  } else {
    validateCoreOutput(circuitJson, artifact.source)
  }
  const relativeOutputPath = artifact.outputPath.replace(/^\//u, "")
  const outputPath = resolve(import.meta.dir, `../public/${relativeOutputPath}`)
  await mkdir(resolve(outputPath, ".."), { recursive: true })
  await writeFile(outputPath, gzipSync(strToU8(JSON.stringify(circuitJson)), { level: 9 }))
  return {
    elementCount: circuitJson.length,
    output: relativeOutputPath,
    source: artifact.source,
  }
}

function validateCoreOutput(circuitJson: AnyCircuitElement[], source: string): void {
  // Core currently emits string pin references (for example, "pin35") in
  // schematic port arrangements while the published circuit-json schema still
  // accepts only numeric references. Preserve core's viewer-compatible output,
  // but still reject malformed elements here. Altium conversions below receive
  // full schema validation.
  for (const [index, element] of circuitJson.entries()) {
    if (typeof element !== "object" || element === null || typeof element.type !== "string") {
      throw new Error(`${basename(source)} produced a malformed element at ${index}`)
    }
  }
}

function removeNullProperties(circuitJson: AnyCircuitElement[]): AnyCircuitElement[] {
  return JSON.parse(
    JSON.stringify(circuitJson, (_key, property) => (property === null ? undefined : property)),
  ) as AnyCircuitElement[]
}

function removeOffBoardPcbComponentBounds(circuitJson: AnyCircuitElement[]): AnyCircuitElement[] {
  const pcbBoard = circuitJson.find((element) => element.type === "pcb_board")
  if (!pcbBoard) return circuitJson

  const halfWidth = pcbBoard.width / 2
  const halfHeight = pcbBoard.height / 2
  const minX = pcbBoard.center.x - halfWidth
  const maxX = pcbBoard.center.x + halfWidth
  const minY = pcbBoard.center.y - halfHeight
  const maxY = pcbBoard.center.y + halfHeight

  // Rotated component text can produce a very large, off-board component bounds
  // record even though its actual silkscreen primitive is on the PCB. Bounds are
  // metadata for interaction, so omit only those invalid bounds and retain all
  // copper, pads, traces, holes, and text from the TI source.
  return circuitJson.filter(
    (element) =>
      element.type !== "pcb_component" ||
      (element.center.x >= minX &&
        element.center.x <= maxX &&
        element.center.y >= minY &&
        element.center.y <= maxY),
  )
}

function validateCircuitJson(circuitJson: AnyCircuitElement[], source: string): void {
  for (const [index, element] of circuitJson.entries()) {
    const result = any_circuit_element.safeParse(element)
    if (!result.success) {
      throw new Error(
        `${basename(source)} produced invalid Circuit JSON at ${index}: ${result.error.message}`,
      )
    }
  }
}
