const generatedDirectory = new URL("../lib/generated/", import.meta.url)
const boardSource = new URL("am62a-board.tsx", generatedDirectory)
const boardSourceCopy = new URL("am62a-board-source.txt", generatedDirectory)

const buildResult = await Bun.build({
  entrypoints: [boardSource.pathname],
  external: ["react", "react/jsx-runtime"],
  format: "esm",
  minify: true,
  naming: "am62a-board.runtime.js",
  outdir: generatedDirectory.pathname,
  target: "bun",
})

if (!buildResult.success) {
  throw new AggregateError(buildResult.logs, "Failed to prepare the generated board runtime")
}

await Bun.write(boardSourceCopy, Bun.file(boardSource))
