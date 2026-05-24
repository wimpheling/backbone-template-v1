import type { NoticeComponent } from "@backbone/design-system-contract"

export const Notice: NoticeComponent = ({ children, tone }) => {
  return <p className={`ds-notice ds-notice--${tone}`}>{children}</p>
}
