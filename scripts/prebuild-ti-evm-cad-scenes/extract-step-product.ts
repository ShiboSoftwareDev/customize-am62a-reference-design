type StepEntityId = string

// Select a product and its child assembly from the pinned BeaglePlay STEP
// release. Follow STEP entity references; retain the original BREP and colors.
export function extractStepProduct({
  step,
  productName,
}: {
  step: string
  productName: string
}): string {
  const entities = new Map<StepEntityId, string>(
    Array.from(step.matchAll(/#(\d+)\s*=\s*(.*?);/gsu), (match) => [match[1]!, match[2]!]),
  )
  const references = new Map<StepEntityId, StepEntityId[]>(
    Array.from(entities, ([id, entity]) => [
      id,
      Array.from(entity.matchAll(/#(\d+)/gu), (match) => match[1]!),
    ]),
  )
  const product = Array.from(entities).find(([, entity]) =>
    entity.startsWith(`PRODUCT('${productName}'`),
  )?.[0]
  if (!product) throw new Error(`Missing STEP product ${productName}`)
  const formation = findReferencingEntity({
    entities,
    references,
    prefix: "PRODUCT_DEFINITION_FORMATION",
    target: product,
  })
  const definition = findReferencingEntity({
    entities,
    references,
    prefix: "PRODUCT_DEFINITION(",
    target: formation,
  })
  const definitions = new Set<StepEntityId>([definition])
  const selected = new Set<StepEntityId>([definition])
  for (const parent of definitions) {
    for (const [id, entity] of entities) {
      const related = references.get(id)!
      if (!entity.startsWith("NEXT_ASSEMBLY_USAGE_OCCURRENCE(") || related[0] !== parent) continue
      selected.add(id)
      selected.add(related[1]!)
      definitions.add(related[1]!)
    }
  }
  for (const prefix of [
    "PRODUCT_DEFINITION_SHAPE(",
    "SHAPE_DEFINITION_REPRESENTATION(",
    "CONTEXT_DEPENDENT_SHAPE_REPRESENTATION(",
  ]) {
    for (const [id, entity] of entities) {
      if (
        entity.startsWith(prefix) &&
        references.get(id)!.some((reference) => selected.has(reference))
      )
        selected.add(id)
    }
  }
  includeReferencedEntities({ references, selected })
  for (const [id, entity] of entities) {
    if (entity.startsWith("STYLED_ITEM(") && selected.has(references.get(id)!.at(-1)!))
      selected.add(id)
  }
  includeReferencedEntities({ references, selected })
  const header = step.slice(0, step.indexOf("DATA;"))
  return `${header}DATA;\n${Array.from(selected)
    .map((id) => `#${id}=${entities.get(id)};`)
    .join("\n")}\nENDSEC;\nEND-ISO-10303-21;\n`
}

function findReferencingEntity({
  entities,
  references,
  prefix,
  target,
}: {
  entities: Map<StepEntityId, string>
  references: Map<StepEntityId, StepEntityId[]>
  prefix: string
  target: StepEntityId
}): StepEntityId {
  const id = Array.from(entities).find(
    ([id, entity]) => entity.startsWith(prefix) && references.get(id)!.includes(target),
  )?.[0]
  if (!id) throw new Error(`Missing ${prefix} for STEP entity ${target}`)
  return id
}

function includeReferencedEntities({
  references,
  selected,
}: {
  references: Map<StepEntityId, StepEntityId[]>
  selected: Set<StepEntityId>
}): void {
  for (const id of selected) {
    for (const reference of references.get(id) ?? []) selected.add(reference)
  }
}
