import type { NavigationComponent } from "@backbone/design-system-contract"

export const Navigation: NavigationComponent = ({ currentHref, items }) => {
  return (
    <nav aria-label="Primary navigation" className="ds-navigation">
      {items.map((item) => (
        <a
          aria-current={item.href === currentHref ? "page" : undefined}
          className="ds-navigation__link"
          href={item.href}
          key={item.href}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}
