import type { ComponentType } from "react"

export type LoaderProps = {
  message: string
}

export type LoaderComponent = ComponentType<LoaderProps>
