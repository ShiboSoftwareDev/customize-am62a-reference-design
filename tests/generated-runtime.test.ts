import { expect, test } from "bun:test"

test("generated board runtime uses the production-safe JSX transform", async () => {
  const runtimePath = new URL("../lib/generated/am62a-board.runtime.js", import.meta.url)
  const runtimeSource = await Bun.file(runtimePath).text()

  expect(runtimeSource).toContain('from"react/jsx-runtime"')
  expect(runtimeSource).not.toContain("react/jsx-dev-runtime")
})
