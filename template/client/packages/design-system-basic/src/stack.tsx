import type { StackComponent } from "@backbone/design-system-contract"

export const Stack: StackComponent = ({ children, gap = "md" }) => {
  return <div className={`ds-stack ds-stack--${gap}`}>{children}</div>
}
