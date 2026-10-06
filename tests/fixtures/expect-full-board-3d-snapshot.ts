import { expect } from "bun:test"
import { resolve } from "node:path"

export async function expectFullBoard3dSnapshot(params: { evmId: string }): Promise<void> {
  const repositoryRoot = resolve(import.meta.dir, "../..")
  const renderedPng = new Uint8Array(
    await Bun.file(
      resolve(repositoryRoot, "public/board-details", params.evmId, "3d.png"),
    ).arrayBuffer(),
  )
  const snapshotPng = new Uint8Array(
    await Bun.file(
      resolve(repositoryRoot, "tests/__snapshots__", `${params.evmId}-3d.snap.png`),
    ).arrayBuffer(),
  )

  expect(renderedPng).toEqual(snapshotPng)
}
