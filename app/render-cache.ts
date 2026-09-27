import type { AnyCircuitElement } from "circuit-json"

const databaseName = "am62a-render-cache"
const storeName = "renders"
const maximumCachedRenders = 8
const maximumCacheBytes = 128 * 1024 * 1024

type CachedRender = {
  key: string
  circuitJsonText: string
  savedAt: number
}

function openRenderDatabase(): Promise<IDBDatabase | null> {
  if (!globalThis.indexedDB) return Promise.resolve(null)

  return new Promise((resolve) => {
    const request = globalThis.indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "key" })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

export async function readCachedRender(key: string): Promise<AnyCircuitElement[] | null> {
  const database = await openRenderDatabase()
  if (!database) return null

  return new Promise((resolve) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(key)
    request.onsuccess = () => {
      try {
        const circuitJsonText = (request.result as CachedRender | undefined)?.circuitJsonText
        resolve(circuitJsonText ? JSON.parse(circuitJsonText) : null)
      } catch {
        resolve(null)
      }
    }
    request.onerror = () => resolve(null)
  })
}

export async function writeCachedRender(params: {
  key: string
  circuitJson: AnyCircuitElement[]
}): Promise<void> {
  const circuitJsonText = JSON.stringify(params.circuitJson)
  if (circuitJsonText.length * 2 > maximumCacheBytes) return
  const database = await openRenderDatabase()
  if (!database) return

  await new Promise<void>((resolve) => {
    const transaction = database.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)
    store.put({ key: params.key, circuitJsonText, savedAt: Date.now() } satisfies CachedRender)
    const allRendersRequest = store.getAll()
    allRendersRequest.onsuccess = () => {
      const renders = (allRendersRequest.result as CachedRender[]).sort(
        (first, second) => second.savedAt - first.savedAt,
      )
      let cacheBytes = 0
      renders.forEach((render, index) => {
        cacheBytes += render.circuitJsonText.length * 2
        if (index >= maximumCachedRenders || cacheBytes > maximumCacheBytes)
          store.delete(render.key)
      })
    }
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => resolve()
    transaction.onabort = () => resolve()
  })
}
