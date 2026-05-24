import type { TextInputComponent } from "@backbone/design-system-contract"

export const TextInput: TextInputComponent = (props) => {
  return <input className="ds-input" {...props} />
}
