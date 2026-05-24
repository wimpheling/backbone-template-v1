import type { TextComponent } from "@backbone/design-system-contract"

export const Text: TextComponent = ({ children, tone = "default", variant = "body" }) => {
  return <p className={`ds-text ds-text--${variant} ds-text--${tone}`}>{children}</p>
}
