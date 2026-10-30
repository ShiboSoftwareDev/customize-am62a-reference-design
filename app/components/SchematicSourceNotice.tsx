export function SchematicSourceNotice({ referenceUrl }: { referenceUrl: string }) {
  return (
    <p className="schematic-source-notice" role="note">
      This diagram is missing from the Altium source.{" "}
      <a href={referenceUrl} target="_blank" rel="noreferrer">
        Open TI’s original design files ↗
      </a>
    </p>
  )
}
