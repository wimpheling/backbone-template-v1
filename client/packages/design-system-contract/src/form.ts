import type { ComponentType, FormEventHandler, ReactNode } from "react"

export type FormProps = {
  children: ReactNode
  ariaLabelledBy?: string
  onSubmit?: FormEventHandler<HTMLFormElement>
}

export type FormComponent = ComponentType<FormProps>
