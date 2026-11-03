import { unzipSync } from "fflate"
import { prebuildStepProductModel } from "./prebuild-step-product-model"

export async function prebuildLinkppConnectorModel(): Promise<void> {
  const response = await fetch(
    "https://omo-oss-file110.thefastfile.com/portal-saas/new2023111719244971110/cms/file/LPJG16314A4NL.zip",
    { headers: { Referer: "https://www.link-pp.com/", "User-Agent": "Mozilla/5.0" } },
  )
  if (!response.ok) throw new Error(`Failed to download LINK-PP STEP: ${response.status}`)
  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()))
  const model = archive["lpjg16314a4nl.stp"]
  if (!model) throw new Error("Missing LINK-PP STEP in manufacturer archive")
  await prebuildStepProductModel({
    step: new TextDecoder().decode(model),
    // Extract the connector only; the supplied assembly also contains a demo PCB.
    productName: "TRJG163XXA4NL",
    outputName: "linkpp-lpjg16314a4nl",
  })
}
