import "tscircuit"
import { Fragment } from "react"
import type {
  ReferenceComponent,
  ReferenceEvmDefinition,
  ReferencePad,
  ReferenceSilkscreen,
} from "./reference-evm-types"

export type ReferenceEvmBoardOptions = {
  removedFeatureIds: string[]
}

export function ReferenceEvmBoard(props: {
  definition: ReferenceEvmDefinition
  options: ReferenceEvmBoardOptions
}) {
  const removedFeatureIds = new Set(props.options.removedFeatureIds)
  const populatedComponents = props.definition.components.filter(
    ({ removableFeatureId }) =>
      removableFeatureId === undefined || !removedFeatureIds.has(removableFeatureId),
  )
  const populatedComponentNames = new Set(populatedComponents.map(({ name }) => name))
  const populatedNets = props.definition.nets
    .map((net) => ({
      ...net,
      endpoints: net.endpoints.filter(({ componentName }) =>
        populatedComponentNames.has(componentName),
      ),
    }))
    .filter(({ endpoints }) => endpoints.length > 1)

  return (
    <board
      title={props.definition.name}
      outline={props.definition.outline}
      width={props.definition.width}
      height={props.definition.height}
      thickness={props.definition.thickness}
      layers={props.definition.layers}
      autorouter="auto"
      autorouterVersion="beta_pipeline9"
      autorouterEffortLevel="1x"
      pcbRelative
      schRelative
      doubleSidedAssembly
    >
      {populatedComponents.map((component) => (
        <ReferenceEvmComponent key={component.name} component={component} />
      ))}
      {props.definition.standaloneHoles.map((pad, index) =>
        renderReferenceEvmPad(pad, `standalone-${index}`),
      )}
      {props.definition.silkscreen
        .filter(
          ({ ownerComponentName }) =>
            ownerComponentName === undefined || populatedComponentNames.has(ownerComponentName),
        )
        .map((silkscreen, index) => (
          <ReferenceEvmSilkscreen key={`silkscreen-${index}`} silkscreen={silkscreen} />
        ))}
      {populatedNets.flatMap((net) =>
        net.endpoints.map((endpoint) => (
          <Fragment key={`${net.name}-${endpoint.componentName}-${endpoint.pinKey}`}>
            <trace
              from={`.${endpoint.componentName} > .${endpoint.pinKey}`}
              to={`net.${net.name}`}
            />
          </Fragment>
        )),
      )}
    </board>
  )
}

function ReferenceEvmComponent({ component }: { component: ReferenceComponent }) {
  const schematic = component.schematic
  const pinArrangement = schematic
    ? {
        leftSide: schematic.leftPins,
        rightSide: schematic.rightPins,
        topSide: schematic.topPins,
        bottomSide: schematic.bottomPins,
      }
    : undefined

  return (
    <chip
      name={component.name}
      manufacturerPartNumber={component.value || undefined}
      pcbX={component.x}
      pcbY={component.y}
      layer={component.layer}
      pcbRotation={0}
      pinLabels={component.pinLabels}
      schX={schematic?.x}
      schY={schematic?.y}
      schWidth={schematic?.width}
      schHeight={schematic?.height}
      schPinArrangement={pinArrangement}
      noSchematicRepresentation={schematic === undefined}
      footprint={
        <footprint>
          {component.pads.map((pad, index) =>
            renderReferenceEvmPad(pad, `${component.name}-${index}`),
          )}
        </footprint>
      }
    />
  )
}

function renderReferenceEvmPad(pad: ReferencePad, key: string) {
  if (pad.kind === "hole") {
    return <hole key={key} pcbX={pad.x} pcbY={pad.y} diameter={pad.diameter} />
  }
  const portHints = pad.pinKey ? [pad.pinKey] : undefined

  if (pad.kind === "plated_hole") {
    if (pad.shape === "circle") {
      return (
        <platedhole
          key={key}
          portHints={portHints}
          pcbX={pad.x}
          pcbY={pad.y}
          shape="circle"
          holeDiameter={pad.holeDiameter ?? 0.8}
          outerDiameter={pad.outerDiameter ?? 1.4}
        />
      )
    }
    if (pad.shape === "circular_hole_with_rect_pad") {
      return (
        <platedhole
          key={key}
          portHints={portHints}
          pcbX={pad.x}
          pcbY={pad.y}
          shape="circular_hole_with_rect_pad"
          holeDiameter={pad.holeDiameter ?? 0.8}
          rectPadWidth={pad.rectPadWidth ?? 1.4}
          rectPadHeight={pad.rectPadHeight ?? 1.4}
        />
      )
    }
    return (
      <platedhole
        key={key}
        portHints={portHints}
        pcbX={pad.x}
        pcbY={pad.y}
        pcbRotation={pad.pcbRotation ?? 0}
        shape="oval"
        holeWidth={pad.holeWidth ?? 0.8}
        holeHeight={pad.holeHeight ?? 0.8}
        outerWidth={pad.outerWidth ?? 1.4}
        outerHeight={pad.outerHeight ?? 1.4}
      />
    )
  }

  if (pad.shape === "circle") {
    return (
      <smtpad
        key={key}
        portHints={portHints}
        pcbX={pad.x}
        pcbY={pad.y}
        layer={pad.layer}
        shape="circle"
        radius={pad.radius ?? 0.25}
      />
    )
  }
  if (pad.shape === "pill") {
    return (
      <smtpad
        key={key}
        portHints={portHints}
        pcbX={pad.x}
        pcbY={pad.y}
        layer={pad.layer}
        shape="pill"
        width={pad.width ?? 0.5}
        height={pad.height ?? 0.5}
        radius={pad.radius ?? 0.25}
      />
    )
  }
  if (pad.shape === "rotated_pill") {
    return (
      <smtpad
        key={key}
        portHints={portHints}
        pcbX={pad.x}
        pcbY={pad.y}
        layer={pad.layer}
        shape="rotated_pill"
        width={pad.width ?? 0.5}
        height={pad.height ?? 0.5}
        radius={pad.radius ?? 0.25}
        ccwRotation={pad.ccwRotation ?? 0}
      />
    )
  }
  if (pad.shape === "rotated_rect") {
    return (
      <smtpad
        key={key}
        portHints={portHints}
        pcbX={pad.x}
        pcbY={pad.y}
        layer={pad.layer}
        shape="rotated_rect"
        width={pad.width ?? 0.5}
        height={pad.height ?? 0.5}
        ccwRotation={pad.ccwRotation ?? 0}
      />
    )
  }
  return (
    <smtpad
      key={key}
      portHints={portHints}
      pcbX={pad.x}
      pcbY={pad.y}
      layer={pad.layer}
      shape="rect"
      width={pad.width ?? 0.5}
      height={pad.height ?? 0.5}
    />
  )
}

function ReferenceEvmSilkscreen({ silkscreen }: { silkscreen: ReferenceSilkscreen }) {
  if (silkscreen.kind === "text") {
    return (
      <silkscreentext
        text={silkscreen.text}
        pcbX={silkscreen.x}
        pcbY={silkscreen.y}
        pcbRotation={silkscreen.rotation}
        fontSize={silkscreen.fontSize}
        layer={silkscreen.layer}
      />
    )
  }
  return (
    <silkscreenpath
      route={silkscreen.route}
      strokeWidth={silkscreen.strokeWidth}
      layer={silkscreen.layer}
    />
  )
}
