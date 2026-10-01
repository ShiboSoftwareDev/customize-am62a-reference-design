import type { ReactNode } from "react"

type TscircuitIntrinsicProps = Record<string, unknown> & {
  children?: ReactNode
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      [elementName: string]: TscircuitIntrinsicProps
    }
  }
}
