import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { parsePrebuiltCircuitJson } from "../../app/parse-prebuilt-circuit-json"
import { tiEvms } from "../../lib/ti-evm-catalog"
import { convertCircuitJsonToCadScene } from "./convert-circuit-json-to-cad-scene"
import { getDnpComponentNames } from "./get-dnp-component-names"
import { readSourceFootprints } from "./read-source-footprints"
import { replacePrimitiveCadModels } from "./replace-primitive-cad-models"

const repositoryRoot = resolve(import.meta.dir, "../..")
const concurrentSceneBuildCount = 2

type CadSceneBuild = {
  circuitJsonUrl: string
  evmId: (typeof tiEvms)[number]["id"]
  evmName: string
  outputUrl: string
  variantLabel: string
}

export async function prebuildTiEvmCadScenes(): Promise<void> {
  const cadSceneBuilds: CadSceneBuild[] = tiEvms.flatMap((evm) =>
    evm.variants.map((variant) => ({
      circuitJsonUrl: variant.circuitJsonUrl,
      evmId: evm.id,
      evmName: evm.name,
      outputUrl: variant.prebuiltCadSceneUrl,
      variantLabel: variant.label,
    })),
  )

  for (
    let buildIndex = 0;
    buildIndex < cadSceneBuilds.length;
    buildIndex += concurrentSceneBuildCount
  ) {
    await Promise.all(
      cadSceneBuilds
        .slice(buildIndex, buildIndex + concurrentSceneBuildCount)
        .map(buildTiEvmCadScene),
    )
  }

  console.log(`Prebuilt ${cadSceneBuilds.length} Sitara CAD scenes`)
}

async function buildTiEvmCadScene(cadSceneBuild: CadSceneBuild): Promise<void> {
  const circuitJsonPath = resolvePublicUrl(cadSceneBuild.circuitJsonUrl)
  const circuitJsonBytes = new Uint8Array(await Bun.file(circuitJsonPath).arrayBuffer())
  const circuitJson = parsePrebuiltCircuitJson(circuitJsonBytes)
  const sourceFootprintByComponentName = await readSourceFootprints(
    resolve(
      repositoryRoot,
      "lib/generated/ti-evms",
      `${cadSceneBuild.evmId}.component-footprints.json`,
    ),
  )
  const enrichedCadModels = replacePrimitiveCadModels({
    circuitJson,
    excludedComponentNames: getDnpComponentNames(cadSceneBuild.evmId),
    sourceFootprintByComponentName,
  })
  const cadScene = await convertCircuitJsonToCadScene({
    circuitJson: enrichedCadModels.circuitJson,
    publicDirectory: resolve(repositoryRoot, "public"),
  })
  const outputPath = resolvePublicUrl(cadSceneBuild.outputUrl)
  await mkdir(resolve(outputPath, ".."), { recursive: true })
  await writeFile(outputPath, cadScene)
  console.log(
    `Prebuilt ${cadSceneBuild.evmName} ${cadSceneBuild.variantLabel} CAD scene: ` +
      `${enrichedCadModels.summary.enrichedComponentCount} package models, ` +
      `${enrichedCadModels.summary.retainedPrimitiveComponentCount} retained source models`,
  )
}

function resolvePublicUrl(publicUrl: string): string {
  return resolve(repositoryRoot, "public", publicUrl.replace(/^\//u, ""))
}
