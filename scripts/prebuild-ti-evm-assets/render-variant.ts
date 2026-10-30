import { tiEvms } from "../../lib/ti-evm-catalog"
import { buildTiEvmVariantArtifact } from "./build-variant"

const [evmId, variantId, resultPath] = Bun.argv.slice(2)
const evm = tiEvms.find(({ id }) => id === evmId)
const variant = evm?.variants.find(({ id }) => id === variantId)
if (!evm || !variant || !resultPath)
  throw new Error("Expected board ID, variant ID, and result path")

const artifact = await buildTiEvmVariantArtifact({ evm, variant })
await Bun.write(resultPath, JSON.stringify(artifact))
console.log(`Prebuilt ${evm.name} ${variant.label} PCB`)
