import type { ComponentType, ReactNode } from "react"

export type EmptyStateProps = {
  action?: ReactNode
  description: string
  title: string
}

export type EmptyStateComponent = ComponentType<EmptyStateProps>
