import type { FormComponent } from "@backbone/design-system-contract"

export const Form: FormComponent = ({ ariaLabelledBy, children, onSubmit }) => {
  return (
    <form aria-labelledby={ariaLabelledBy} className="ds-form" onSubmit={onSubmit}>
      {children}
    </form>
  )
}
