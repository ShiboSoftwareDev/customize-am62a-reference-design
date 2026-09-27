import { fileURLToPath, URL } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      app: fileURLToPath(new URL("./app", import.meta.url)),
      lib: fileURLToPath(new URL("./lib", import.meta.url)),
      tests: fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
        proxyTimeout: 300_000,
        timeout: 300_000,
      },
    },
  },
})
