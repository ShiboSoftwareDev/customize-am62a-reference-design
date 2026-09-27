import { evaluateBoard } from "./evaluate-board"
import { getBoardSource } from "./get-board-source"
import { normalizeRenderRequest } from "./normalize-render-request"

const apiServer = Bun.serve({
  hostname: "127.0.0.1",
  port: 5174,
  idleTimeout: 255,
  async fetch(request, server) {
    const url = new URL(request.url)
    if (request.method !== "POST" || !url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 })
    }

    server.timeout(request, 255)

    try {
      const renderRequest = normalizeRenderRequest(await request.json())
      if (url.pathname === "/api/evaluate") {
        return Response.json(await evaluateBoard(renderRequest))
      }
      if (url.pathname === "/api/source") {
        return new Response(await getBoardSource(renderRequest), {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      }
      return new Response("Not found", { status: 404 })
    } catch (error) {
      console.error(error)
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      )
    }
  },
})

console.log(`AM62A API listening on ${apiServer.url}`)
