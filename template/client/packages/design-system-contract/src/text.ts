import type { ComponentType, ReactNode } from "react"

export type TextProps = {
  children: ReactNode
  tone?: "default" | "muted" | "accent" | "danger"
  variant?: "body" | "lede" | "eyebrow"
}

export type TextComponent = ComponentType<TextProps>
