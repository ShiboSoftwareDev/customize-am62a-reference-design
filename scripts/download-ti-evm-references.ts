import { createHash } from "node:crypto"
import { mkdir, rm } from "node:fs/promises"
import { resolve } from "node:path"
import { unzipSync } from "fflate"

type ReferenceArchive = {
  name: string
  url: string
  sha256: string
  outputDirectory: string
  nestedArchivePath?: string
  stripPrefix?: string
}

const references: ReferenceArchive[] = [
  {
    name: "TMDS62LEVM",
    url: "https://www.ti.com/lit/zip/sprcal9",
    sha256: "40e6c4d0bea5381bf7b4e0ef26ec4ec9adae156be308e4a3838bd344972b7615",
    outputDirectory: "tmds62levm",
    nestedArchivePath:
      "TMDS62LEVM Design File Package Altium (Rev. B)/PROC180/PROC181E1_1/3_BoardFile/Altium/PROC181E1-1_PRJPCB.zip",
  },
  {
    name: "SK-AM62",
    url: "https://e2e.ti.com/cfs-file/__key/communityserver-discussions-components-files/791/7384.AM62x_5F00_E3_5F00_Altium.zip",
    sha256: "14f84ba83c82db636b7425a874d599fea2a3cd0b72f365460b943d53ffc26982",
    outputDirectory: "sk-am62",
  },
  {
    name: "SK-AM62 official connectivity source",
    url: "https://www.ti.com/lit/zip/sprr448",
    sha256: "af1c3bad7b67eafea831c773840bbba8fdbad25e0ab9eff32119747ca8cd162b",
    outputDirectory: "sk-am62-official",
  },
  {
    name: "BeaglePlay",
    url: "https://github.com/beagleboard/beagleplay/archive/7a59a98ae27dc4fd9e2bd8975ff90cdb44a366ea.zip",
    sha256: "6b2b29a35e308237891d91f2c0b131653c0a01700ab8e5345e31bed3ddf2101e",
    outputDirectory: "beagleplay",
    stripPrefix:
      "beagleplay-7a59a98ae27dc4fd9e2bd8975ff90cdb44a366ea/Design/Altium Export/BEAGLEPLAYV020_220915.PrjPcb/",
  },
  {
    name: "BeagleBone Black",
    url: "https://github.com/Circuitco/-BeagleBone-Black-RevA5/raw/master/BeagleBoardBlack_RevA5_Altium.zip",
    sha256: "7ff2ca881779f51b9fcb83e041bd06125fc2cb91ba5111c8d360b9df1a651413",
    outputDirectory: "beaglebone-black",
    nestedArchivePath: "BeagleBoneBlackB3_Altium.zip",
  },
]

const referenceRoot = resolve(import.meta.dir, "../tmp/references")

for (const reference of references) {
  const response = await fetch(reference.url)
  if (!response.ok) {
    throw new Error(`${reference.name} download failed with HTTP ${response.status}`)
  }
  const archive = new Uint8Array(await response.arrayBuffer())
  const sha256 = createHash("sha256").update(archive).digest("hex")
  if (sha256 !== reference.sha256) {
    throw new Error(`${reference.name} archive checksum changed: ${sha256}`)
  }

  const outputDirectory = resolve(referenceRoot, reference.outputDirectory)
  await rm(outputDirectory, { force: true, recursive: true })
  await mkdir(outputDirectory, { recursive: true })
  const outerEntries = unzipSync(archive)
  const entries = reference.nestedArchivePath
    ? unzipNestedArchive({
        entries: outerEntries,
        nestedArchivePath: reference.nestedArchivePath,
        referenceName: reference.name,
      })
    : outerEntries
  await extractArchiveEntries({
    entries,
    outputDirectory,
    referenceName: reference.name,
    stripPrefix: reference.stripPrefix,
  })
  console.log(`${reference.name}: verified and extracted ${sha256}`)
}

function unzipNestedArchive(params: {
  entries: Record<string, Uint8Array>
  nestedArchivePath: string
  referenceName: string
}): Record<string, Uint8Array> {
  const nestedArchive = params.entries[params.nestedArchivePath]
  if (!nestedArchive) {
    throw new Error(`${params.referenceName} is missing nested archive ${params.nestedArchivePath}`)
  }
  return unzipSync(nestedArchive)
}

async function extractArchiveEntries(params: {
  entries: Record<string, Uint8Array>
  outputDirectory: string
  referenceName: string
  stripPrefix?: string
}): Promise<void> {
  for (const [entryName, contents] of Object.entries(params.entries)) {
    if (params.stripPrefix && !entryName.startsWith(params.stripPrefix)) continue
    const relativeEntryName = params.stripPrefix
      ? entryName.slice(params.stripPrefix.length)
      : entryName
    if (!relativeEntryName) continue
    if (relativeEntryName.startsWith("/") || relativeEntryName.split("/").includes("..")) {
      throw new Error(`${params.referenceName} archive contains an unsafe path: ${entryName}`)
    }
    const outputPath = resolve(params.outputDirectory, relativeEntryName)
    if (relativeEntryName.endsWith("/")) {
      await mkdir(outputPath, { recursive: true })
      continue
    }
    await mkdir(resolve(outputPath, ".."), { recursive: true })
    await Bun.write(outputPath, contents)
  }
}
