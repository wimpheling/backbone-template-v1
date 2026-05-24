import type { ComponentType, ReactNode } from "react"

export type InlineProps = {
  children: ReactNode
}

export type InlineComponent = ComponentType<InlineProps>
