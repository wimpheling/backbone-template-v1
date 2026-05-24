import type { ButtonHTMLAttributes, ComponentType } from "react"

type ButtonVariant = "primary" | "secondary" | "danger"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: ButtonVariant
}

export type ButtonComponent = ComponentType<ButtonProps>
