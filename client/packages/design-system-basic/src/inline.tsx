import type { InlineComponent } from "@backbone/design-system-contract"

export const Inline: InlineComponent = ({ children }) => {
  return <div className="ds-inline">{children}</div>
}
