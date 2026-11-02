import { expect } from "bun:test"
import { resolve } from "node:path"

export async function expectPcbRenderCompletion(scenario: "cached" | "remount") {
  // Keep DOM globals and the controlled viewer isolated from conversion tests.
  const subprocess = Bun.spawn(
    [process.execPath, resolve(import.meta.dir, "check-pcb-render-completion.tsx"), scenario],
    {
      cwd: resolve(import.meta.dir, "../.."),
      stdout: "pipe",
      stderr: "pipe",
    },
  )
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ])
  expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
}
