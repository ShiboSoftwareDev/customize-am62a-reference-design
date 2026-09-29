import type { TiEvm, TiEvmId, TiEvmVariant } from "lib/ti-evm-catalog"

type ConfigurationPanelProps = {
  evms: TiEvm[]
  evm: TiEvm
  variant: TiEvmVariant
  statusText: string
  error: string
  onEvmChange: (evmId: TiEvmId) => void
  onFeatureRemovalChange: (featureId: string, removed: boolean) => void
  onSelectFullBoard: () => void
  onSelectMinimalBoard: () => void
  onRetry: () => void
  onExportCircuitJson: () => void
  canExportCircuitJson: boolean
}

export function ConfigurationPanel(props: ConfigurationPanelProps) {
  const isFullBoard = props.variant.removedFeatureIds.length === 0
  const isMinimalBoard =
    props.variant.removedFeatureIds.length === props.evm.removableFeatures.length

  return (
    <aside className="configuration-panel">
      <header className="board-title">
        <span className="eyebrow">Parameterized TSX configurator</span>
        <h1>TI EVM Configurator</h1>
      </header>

      <label className="select-field">
        <span>Board</span>
        <select
          value={props.evm.id}
          onChange={(event) => {
            const selectedEvm = props.evms.find(({ id }) => id === event.currentTarget.value)
            if (selectedEvm) props.onEvmChange(selectedEvm.id)
          }}
        >
          {props.evms.map((evm) => (
            <option key={evm.id} value={evm.id}>
              {evm.name}
            </option>
          ))}
        </select>
      </label>

      <div className="evm-summary">
        <small>{props.evm.category}</small>
        <strong>{props.evm.name}</strong>
        <p>{props.evm.description}</p>
      </div>

      <fieldset className="configuration-options">
        <legend>Remove optional blocks</legend>
        <div className="configuration-quick-actions">
          <button disabled={isFullBoard} onClick={props.onSelectFullBoard} type="button">
            Full board
          </button>
          <button disabled={isMinimalBoard} onClick={props.onSelectMinimalBoard} type="button">
            Minimal board
          </button>
        </div>
        {props.evm.removableFeatures.map((feature) => {
          const isRemoved = props.variant.removedFeatureIds.includes(feature.id)
          return (
            <label className="configuration-choice" data-selected={isRemoved} key={feature.id}>
              <input
                checked={isRemoved}
                onChange={(event) =>
                  props.onFeatureRemovalChange(feature.id, event.currentTarget.checked)
                }
                type="checkbox"
              />
              <span>
                <strong>Remove {feature.label}</strong>
                <small>{feature.description}</small>
              </span>
            </label>
          )
        })}
      </fieldset>

      <div className="source-links">
        <a href={props.evm.sourceUrl} rel="noreferrer" target="_blank">
          {props.evm.sourceLabel} ↗
        </a>
      </div>

      <button
        className="export-json-button"
        type="button"
        disabled={!props.canExportCircuitJson}
        onClick={props.onExportCircuitJson}
      >
        Export PCB Circuit JSON
      </button>

      <p className="render-status" role="status">
        {props.statusText}
      </p>
      {props.error && (
        <div className="render-error" role="alert">
          <p>{props.error}</p>
          <button type="button" onClick={props.onRetry}>
            Retry load
          </button>
        </div>
      )}
    </aside>
  )
}
