import {
  boosterPackBoards,
  boosterPackSourceRepositoryUrl,
  type BoosterPackBoard,
  type BoosterPackConfiguration,
  type BoosterPackId,
} from "lib/boosterpack-configurations"

type ConfigurationPanelProps = {
  board: BoosterPackBoard
  configuration: BoosterPackConfiguration
  statusText: string
  error: string
  onBoardChange: (boardId: BoosterPackId) => void
  onFeatureRemovalChange: (featureId: string, removed: boolean) => void
  onRetry: () => void
  onExportCircuitJson: () => void
  canExportCircuitJson: boolean
}

export function ConfigurationPanel(props: ConfigurationPanelProps) {
  return (
    <aside className="configuration-panel">
      <header className="board-title">
        <span className="eyebrow">Source-backed board configurator</span>
        <h1>TI BoosterPacks</h1>
        <p>
          Select a real tscircuit board, then remove any combination of optional subsystems. Every
          combination is prebuilt; remove them all to see the minimal required board.
        </p>
      </header>

      <fieldset className="board-picker">
        <legend>Board</legend>
        {boosterPackBoards.map((boosterPack) => (
          <label
            className="board-choice"
            data-selected={boosterPack.id === props.board.id}
            key={boosterPack.id}
          >
            <input
              checked={boosterPack.id === props.board.id}
              name="boosterpack-board"
              onChange={() => props.onBoardChange(boosterPack.id)}
              type="radio"
            />
            <img alt="" src={boosterPack.thumbnailUrl} />
            <span>
              <small>{boosterPack.category}</small>
              <strong>{boosterPack.name}</strong>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="configuration-options">
        <legend>
          Remove optional blocks ({props.board.configurations.length} prebuilt combinations)
        </legend>
        {props.board.removableFeatures.map((feature) => {
          const isRemoved = props.configuration.removedFeatureIds.includes(feature.id)
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
        <div className="configuration-summary">
          <strong>{props.configuration.label}</strong>
          <small>{props.configuration.description}</small>
        </div>
      </fieldset>

      <div className="source-links">
        <a href={props.board.sourceUrl} rel="noreferrer" target="_blank">
          View this board’s TSX ↗
        </a>
        <a href={boosterPackSourceRepositoryUrl} rel="noreferrer" target="_blank">
          All BoosterPacks ↗
        </a>
      </div>

      <button
        className="export-json-button"
        type="button"
        disabled={!props.canExportCircuitJson}
        onClick={props.onExportCircuitJson}
      >
        Export selected Circuit JSON
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
