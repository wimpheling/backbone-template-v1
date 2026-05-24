import assert from "node:assert/strict"
import { describe, test } from "vitest"
import { createPreviewDynamicProps } from "./create-preview-events"

type ExampleDynamicProps = {
  onNameChanged(value: string): void
  onSubmitted(): void
}

const dynamicPropKeys = ["onNameChanged", "onSubmitted"] as const

describe("createPreviewDynamicProps", () => {
  test("creates default functions for required dynamic prop keys", () => {
    const { dynamicProps } = createPreviewDynamicProps<ExampleDynamicProps>(dynamicPropKeys)

    assert.equal(typeof dynamicProps.onNameChanged, "function")
    assert.equal(typeof dynamicProps.onSubmitted, "function")
  })

  test("records dynamic prop names and args", () => {
    const { calls, dynamicProps } = createPreviewDynamicProps<ExampleDynamicProps>(
      dynamicPropKeys,
      {
        record: true,
      },
    )

    dynamicProps.onNameChanged("Alice")
    dynamicProps.onSubmitted()

    assert.deepEqual(calls, [
      { name: "onNameChanged", args: ["Alice"] },
      { name: "onSubmitted", args: [] },
    ])
  })
})
