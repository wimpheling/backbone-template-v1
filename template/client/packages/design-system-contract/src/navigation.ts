import type { ComponentType } from "react"

type NavigationItem = {
  href: string
  label: string
}

export type NavigationProps = {
  currentHref?: string
  items: NavigationItem[]
}

export type NavigationComponent = ComponentType<NavigationProps>
