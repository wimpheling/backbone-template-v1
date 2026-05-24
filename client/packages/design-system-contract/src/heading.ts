import type { ComponentType, ReactNode } from "react"

export type HeadingProps = {
  children: ReactNode
  id?: string
  level?: 1 | 2 | 3
}

export type HeadingComponent = ComponentType<HeadingProps>
