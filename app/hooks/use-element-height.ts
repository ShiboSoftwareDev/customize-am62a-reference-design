import { useEffect, useRef, useState } from "react"

export function useElementHeight<TElement extends HTMLElement>() {
  const elementRef = useRef<TElement>(null)
  const [height, setHeight] = useState(620)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setHeight(Math.max(360, Math.floor(entry.contentRect.height)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return { elementRef, height }
}
