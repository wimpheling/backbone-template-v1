import type { LayoutComponent } from "@backbone/design-system-contract"
import type { CSSProperties } from "react"

export const Layout: LayoutComponent = ({ middle, middleWidthPx = 680 }) => {
  const middleStyle = { "--ds-middle-width": `${middleWidthPx}px` } as CSSProperties

  return (
    <main className="ds-layout">
      <section className="ds-layout__middle" style={middleStyle}>
        {middle}
      </section>
    </main>
  )
}
