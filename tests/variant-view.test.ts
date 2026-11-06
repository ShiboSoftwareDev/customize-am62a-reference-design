import { expect, test } from "bun:test"
import { resolve } from "node:path"

test("variant switches retain the PCB during load and restore an omitted schematic sheet", async () => {
  const subprocess = Bun.spawn(
    [process.execPath, resolve(import.meta.dir, "fixtures/check-variant-view.tsx")],
    { stdout: "ignore", stderr: "pipe" },
  )
  const [stderr, exitCode] = await Promise.all([
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ])
  expect(exitCode, stderr).toBe(0)
})
