import { expect, test } from "bun:test"
import { resolve } from "node:path"

test("switching boards in 3D defers PCB Circuit JSON until export or viewing", async () => {
  const subprocess = Bun.spawn(
    [process.execPath, resolve(import.meta.dir, "fixtures/check-on-demand-pcb.tsx")],
    { stdout: "ignore", stderr: "pipe" },
  )
  const [stderr, exitCode] = await Promise.all([
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ])
  expect(exitCode, stderr).toBe(0)
})
