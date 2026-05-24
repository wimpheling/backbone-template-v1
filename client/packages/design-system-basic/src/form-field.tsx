import type { FormFieldComponent } from "@backbone/design-system-contract"

export const FormField: FormFieldComponent = ({ children, inputId, label }) => {
  return (
    <label className="ds-field" htmlFor={inputId}>
      <span className="ds-field__label">{label}</span>
      {children}
    </label>
  )
}
