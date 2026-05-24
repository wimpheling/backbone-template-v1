import type { ComponentType, ReactNode } from "react"

export type LayoutProps = {
  middle: ReactNode
  middleWidthPx?: number
}

export type LayoutComponent = ComponentType<LayoutProps>
