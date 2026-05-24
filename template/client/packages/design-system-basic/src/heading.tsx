import type { HeadingComponent } from "@backbone/design-system-contract"

export const Heading: HeadingComponent = ({ children, id, level = 1 }) => {
  if (level === 2) {
    return (
      <h2 className="ds-heading ds-heading--2" id={id}>
        {children}
      </h2>
    )
  }

  if (level === 3) {
    return (
      <h3 className="ds-heading ds-heading--3" id={id}>
        {children}
      </h3>
    )
  }

  return (
    <h1 className="ds-heading ds-heading--1" id={id}>
      {children}
    </h1>
  )
}
