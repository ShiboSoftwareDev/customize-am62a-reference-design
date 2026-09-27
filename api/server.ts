import "fflate"
import { evaluateBoard } from "../lib/server/evaluate-board"
import { getBoardSource } from "../lib/server/get-board-source"
import { normalizeRenderRequest } from "../lib/server/normalize-render-request"

Bun.serve({
  idleTimeout: 255,
  async fetch(request, server) {
    const url = new URL(request.url)
    if (request.method !== "POST") {
      return new Response("POST required", { status: 405 })
    }

    server.timeout(request, 255)

    try {
      const renderRequest = normalizeRenderRequest(await request.json())
      const route = url.searchParams.get("route")

      if (route === "evaluate") {
        return Response.json(await evaluateBoard(renderRequest))
      }

      if (route === "source") {
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
