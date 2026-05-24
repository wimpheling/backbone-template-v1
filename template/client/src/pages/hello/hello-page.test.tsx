import assert from "node:assert/strict"
import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, test } from "vitest"
import { HelloPage, type HelloPageDynamicProps, type HelloPageStaticProps } from "./hello-page"

type ElementWithProps<Props> = ReactElement<Props>

const defaultStaticProps: HelloPageStaticProps = {
  eyebrow: "Backbone",
  title: "ConnectRPC helloworld",
  greeting: "Hello, World!",
  name: "World",
  nameLabel: "Name",
  namePlaceholder: "World",
  submitLabel: "Say hello",
  isSubmitting: false,
  error: null,
}

function createDynamicProps(): HelloPageDynamicProps & {
  calls: Array<{ name: keyof HelloPageDynamicProps; args: unknown[] }>
} {
  const calls: Array<{ name: keyof HelloPageDynamicProps; args: unknown[] }> = []

  return {
    calls,
    onNameChanged(value) {
      calls.push({ name: "onNameChanged", args: [value] })
    },
    onSubmitted() {
      calls.push({ name: "onSubmitted", args: [] })
    },
  }
}

describe("HelloPage", () => {
  test("renders from plain params", () => {
    const html = renderToStaticMarkup(
      <HelloPage {...defaultStaticProps} {...createDynamicProps()} />,
    )

    assert.match(html, /ConnectRPC helloworld/)
    assert.match(html, /Hello, World!/)
    assert.match(html, /value="World"/)
    assert.match(html, /Say hello/)
  })

  test("wires input and form events", () => {
    const dynamicProps = createDynamicProps()
    const element = HelloPage({ ...defaultStaticProps, ...dynamicProps })
    const layoutProps = element.props as { middle: ReactElement }
    const outerStack = layoutProps.middle as ElementWithProps<{
      children: ReactElement[]
    }>
    const form = outerStack.props.children[1] as ElementWithProps<{
      children: ReactElement
      onSubmit(event: { preventDefault(): void }): void
    }>
    const formField = form.props.children as ElementWithProps<{
      children: ReactElement
    }>
    const inline = formField.props.children as ElementWithProps<{
      children: ReactElement[]
    }>
    const input = inline.props.children[0] as ElementWithProps<{
      onChange(event: { target: { value: string } }): void
    }>

    input.props.onChange({ target: { value: "Alice" } })
    form.props.onSubmit({ preventDefault() {} })

    assert.deepEqual(dynamicProps.calls, [
      { name: "onNameChanged", args: ["Alice"] },
      { name: "onSubmitted", args: [] },
    ])
  })

  test("renders error notice only when error is present", () => {
    const withoutError = renderToStaticMarkup(
      <HelloPage {...defaultStaticProps} {...createDynamicProps()} />,
    )
    const withError = renderToStaticMarkup(
      <HelloPage {...defaultStaticProps} {...createDynamicProps()} error="Request failed" />,
    )

    assert.doesNotMatch(withoutError, /Request failed/)
    assert.match(withError, /Request failed/)
  })
})
