import type { ComponentType, ReactNode } from "react"

export type FormFieldProps = {
  children: ReactNode
  inputId: string
  label: ReactNode
}

export type FormFieldComponent = ComponentType<FormFieldProps>
