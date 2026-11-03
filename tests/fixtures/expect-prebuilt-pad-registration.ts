import { expect } from "bun:test"
import { applyToPoint, compose, inverse, rotateDEG, translate } from "transformation-matrix"
import { parsePrebuiltCircuitJson } from "../../app/parse-prebuilt-circuit-json"
import { getTiEvm, type TiEvmId } from "../../lib/ti-evm-catalog"
import type { ComponentName } from "../../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"
import { getMeshContactCenters } from "./get-mesh-contact-centers"
import { readGlbComponentMesh } from "./read-glb-component-mesh"
import type { AnyCircuitElement } from "circuit-json"

type SourceComponentId = string
type PcbComponentId = string

type ComponentRegistration = {
  componentName: ComponentName
  pinCount: number
  expectedPadCount?: number
}

export async function expectPrebuiltPadRegistration({
  components,
  evmId,
  variantId,
}: {
  components: ComponentRegistration[]
  evmId: TiEvmId
  variantId?: string
}): Promise<void> {
  const registrationErrors: string[] = []
  const variants = getTiEvm(evmId).variants.filter(
    (variant) => variantId === undefined || variant.id === variantId,
  )
  expect(variants.length).toBeGreaterThan(0)
  for (const variant of variants) {
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(await Bun.file(`public${variant.circuitJsonUrl}`).arrayBuffer()),
    )
    const glb = await Bun.file(`public${variant.prebuiltCadSceneUrl}`).arrayBuffer()
    const board = circuitJson.find((element) => element.type === "pcb_board")
    if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
    const sourceComponentIdByName = new Map<ComponentName, SourceComponentId>()
    const pcbComponentBySourceComponentId = new Map<SourceComponentId, AnyCircuitElement>()
    const padsByPcbComponentId = new Map<PcbComponentId, AnyCircuitElement[]>()
    for (const element of circuitJson) {
      if (
        element.type === "source_component" &&
        typeof element.name === "string" &&
        typeof element.source_component_id === "string"
      )
        sourceComponentIdByName.set(element.name, element.source_component_id)
      if (element.type === "pcb_component" && typeof element.source_component_id === "string")
        pcbComponentBySourceComponentId.set(element.source_component_id, element)
      if (element.type === "pcb_smtpad" && typeof element.pcb_component_id === "string") {
        const pads = padsByPcbComponentId.get(element.pcb_component_id) ?? []
        pads.push(element)
        padsByPcbComponentId.set(element.pcb_component_id, pads)
      }
    }
    for (const { componentName, pinCount, expectedPadCount = pinCount } of components) {
      const component = pcbComponentBySourceComponentId.get(
        sourceComponentIdByName.get(componentName) ?? "",
      )
      if (!component) continue
      if (typeof component.pcb_component_id !== "string") throw new Error("Missing component ID")
      const surfaceZ = ((component.layer === "bottom" ? -1 : 1) * board.thickness) / 2
      const mesh = readGlbComponentMesh({ componentName, glb, surfaceZ })
      const contactCenters = getMeshContactCenters({ mesh, surfaceZ })
      const pads = (padsByPcbComponentId.get(component.pcb_component_id) ?? []).filter(
        (element) =>
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
        const boardToPadTransform = inverse(padToBoardTransform)
        const centersOnPad = contactCenters.filter((center) => {
          const localCenter = applyToPoint(boardToPadTransform, center)
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
