import type { TiEvm, TiEvmId, TiEvmVariant } from "lib/ti-evm-catalog"

type ConfigurationPanelProps = {
  evms: TiEvm[]
  evm: TiEvm
  variant: TiEvmVariant
  statusText: string
  error: string
  onEvmChange: (evmId: TiEvmId) => void
  onVariantChange: (variantId: string) => void
  onRetry: () => void
  onExportCircuitJson: () => void
  canExportCircuitJson: boolean
}

export function ConfigurationPanel(props: ConfigurationPanelProps) {
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

      <label className="select-field">
        <span>Variant</span>
        <select
          value={props.variant.id}
          onChange={(event) => props.onVariantChange(event.currentTarget.value)}
        >
          {props.evm.variants.map((variant) => (
            <option key={variant.id} value={variant.id}>
              {variant.label}
            </option>
          ))}
        </select>
      </label>

      <p className="variant-description">{props.variant.description}</p>

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
