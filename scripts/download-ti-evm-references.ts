import { createHash } from "node:crypto"
import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import { unzipSync } from "fflate"

const references = [
  {
    name: "DRV8307EVM",
    url: "https://www.ti.com/lit/zip/slvc565a",
    sha256: "660117e30c1f12473f18d825a8318a5460a13025a7a6223689ac1f9afd3921d8",
    outputDirectory: "drv8307",
  },
  {
    name: "LM5155EVM-FLY",
    url: "https://www.ti.com/lit/zip/SNVR499",
    sha256: "e8a1573658d294c6b47c8cdd8833df2d50302ac242afe88ecb8e60ca2f80b215",
    outputDirectory: "lm5155fly",
  },
  {
    name: "LM251772EVM-PD",
    url: "https://www.ti.com/lit/zip/slvc869",
    sha256: "d538f1bb6dc0976a1d0509faf0a9f6a7932fc1e80ed3730740272fb390e8516f",
    outputDirectory: "lm251772",
  },
  {
    name: "LMG342X-BB-EVM",
    url: "https://www.ti.com/lit/zip/snoc050",
    sha256: "3aba23eea3b9c4751d55468e8716a2c95277b9cd581edc9ae8ef4fb058717b09",
    outputDirectory: "lmg342x",
  },
] as const

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
  await mkdir(outputDirectory, { recursive: true })
  for (const [entryName, contents] of Object.entries(unzipSync(archive))) {
    if (entryName.startsWith("/") || entryName.split("/").includes("..")) {
      throw new Error(`${reference.name} archive contains an unsafe path: ${entryName}`)
    }
    const outputPath = resolve(outputDirectory, entryName)
    if (entryName.endsWith("/")) {
      await mkdir(outputPath, { recursive: true })
      continue
    }
    await mkdir(resolve(outputPath, ".."), { recursive: true })
    await Bun.write(outputPath, contents)
  }
  console.log(`${reference.name}: verified and extracted ${sha256}`)
}
