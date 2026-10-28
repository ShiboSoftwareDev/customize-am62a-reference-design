import { expect, test } from "bun:test"
import { resolve } from "node:path"
import { tiEvms } from "lib/ti-evm-catalog"
import { readSourceFootprints } from "../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"

test("reads a source footprint map for every Sitara board", async () => {
  const sourceFootprintDirectory = resolve(import.meta.dir, "../lib/generated/ti-evms")

  for (const evm of tiEvms) {
    const sourceFootprintByComponentName = await readSourceFootprints(
      resolve(sourceFootprintDirectory, `${evm.id}.component-footprints.json`),
    )

    expect(sourceFootprintByComponentName.size).toBeGreaterThan(0)
  }
})
