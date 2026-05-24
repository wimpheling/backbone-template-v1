import type { ComponentType, ReactNode } from "react"

export type StackProps = {
  children: ReactNode
  gap?: "sm" | "md" | "lg"
}

export type StackComponent = ComponentType<StackProps>
