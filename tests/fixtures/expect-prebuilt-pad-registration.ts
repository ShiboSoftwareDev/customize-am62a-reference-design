import { expect } from "bun:test"
import { applyToPoint, compose, inverse, rotateDEG, translate } from "transformation-matrix"
import { parsePrebuiltCircuitJson } from "../../app/parse-prebuilt-circuit-json"
import { getTiEvm, type TiEvmId } from "../../lib/ti-evm-catalog"
import type { ComponentName } from "../../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"
import { getMeshContactCenters } from "./get-mesh-contact-centers"
import { readGlbComponentMesh } from "./read-glb-component-mesh"

type ComponentRegistration = {
  componentName: ComponentName
  pinCount: number
  expectedPadCount?: number
}

export async function expectPrebuiltPadRegistration({
  components,
  evmId,
}: {
  components: ComponentRegistration[]
  evmId: TiEvmId
}): Promise<void> {
  const registrationErrors: string[] = []
  for (const variant of getTiEvm(evmId).variants) {
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(await Bun.file(`public${variant.circuitJsonUrl}`).arrayBuffer()),
    )
    const glb = await Bun.file(`public${variant.prebuiltCadSceneUrl}`).arrayBuffer()
    const board = circuitJson.find((element) => element.type === "pcb_board")
    if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
    for (const { componentName, pinCount, expectedPadCount = pinCount } of components) {
      const source = circuitJson.find(
        (element) => element.type === "source_component" && element.name === componentName,
      )
      const component = circuitJson.find(
        (element) =>
          element.type === "pcb_component" &&
          element.source_component_id === source?.source_component_id,
      )
      if (!component) continue
      const mesh = readGlbComponentMesh({ componentName, glb })
      const surfaceZ = ((component.layer === "bottom" ? -1 : 1) * board.thickness) / 2
      const contactCenters = getMeshContactCenters({ mesh, surfaceZ })
      const pads = circuitJson.filter(
        (element) =>
          element.type === "pcb_smtpad" &&
          element.pcb_component_id === component.pcb_component_id &&
          Array.isArray(element.port_hints) &&
          element.port_hints.some(
            (hint) => typeof hint === "string" && /^\d+$/u.test(hint) && Number(hint) <= pinCount,
          ),
      )
      expect(pads, `${evmId} ${variant.id} ${componentName}`).toHaveLength(expectedPadCount)
      for (const pad of pads) {
        if (
          !("width" in pad) ||
          !("height" in pad) ||
          typeof pad.width !== "number" ||
          typeof pad.height !== "number"
        )
          throw new Error("Missing rectangular pad geometry")
        if (typeof pad.x !== "number" || typeof pad.y !== "number")
          throw new Error("Missing pad position")
        const padWidth = pad.width
        const padHeight = pad.height
        const padToBoardTransform = compose(
          translate(pad.x, pad.y),
          rotateDEG(typeof pad.ccw_rotation === "number" ? pad.ccw_rotation : 0),
        )
        const centersOnPad = contactCenters.filter((center) => {
          const localCenter = applyToPoint(inverse(padToBoardTransform), center)
          return Math.abs(localCenter.x) <= padWidth / 2 && Math.abs(localCenter.y) <= padHeight / 2
        })
        if (centersOnPad.length !== 1)
          registrationErrors.push(
            `${evmId} ${variant.id} ${componentName} ${pad.pcb_smtpad_id}: ${centersOnPad.length} lead centers`,
          )
      }
    }
  }
  expect(registrationErrors).toEqual([])
}
