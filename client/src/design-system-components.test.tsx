import assert from "node:assert/strict"
import { Button, EmptyState, Loader, Navigation } from "@backbone/design-system"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, test } from "vitest"

describe("Button", () => {
  test("renders primary, secondary, and danger variants", () => {
    const primary = renderToStaticMarkup(<Button>Say hello</Button>)
    const secondary = renderToStaticMarkup(<Button variant="secondary">View history</Button>)
    const danger = renderToStaticMarkup(<Button variant="danger">Clear history</Button>)

    assert.match(primary, /ds-button--primary/)
    assert.match(secondary, /ds-button--secondary/)
    assert.match(danger, /ds-button--danger/)
  })

  test("renders loading state as disabled without hiding the label", () => {
    const html = renderToStaticMarkup(<Button loading>Importing...</Button>)

    assert.match(html, /ds-button--loading/)
    assert.match(html, /disabled/)
    assert.match(html, /Importing/)
  })
})

describe("EmptyState", () => {
  test("renders title and description", () => {
    const html = renderToStaticMarkup(
      <EmptyState description="Say hello to create the first saved input." title="No inputs yet" />,
    )

    assert.match(html, /No inputs yet/)
    assert.match(html, /Say hello/)
  })

  test("renders an optional action", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        action={<Button>Say hello</Button>}
        description="Create a saved hello-world input."
        title="No inputs yet"
      />,
    )

    assert.match(html, /ds-empty-state__actions/)
    assert.match(html, /Say hello/)
  })
})

describe("Loader", () => {
  test("renders a configurable loading message", () => {
    const html = renderToStaticMarkup(<Loader message="Loading hello-world inputs..." />)

    assert.match(html, /ds-loader/)
    assert.match(html, /Loading hello-world inputs/)
  })
})

describe("Navigation", () => {
  test("renders navigation links", () => {
    const html = renderToStaticMarkup(
      <Navigation
        currentHref="/hello"
        items={[
          { href: "/hello", label: "Hello" },
          { href: "/history", label: "History" },
        ]}
      />,
    )

    assert.match(html, /href="\/hello"/)
    assert.match(html, /href="\/history"/)
    assert.match(html, /aria-current="page"/)
  })
})
