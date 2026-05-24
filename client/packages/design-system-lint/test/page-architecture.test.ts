import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { checkPageArchitecture } from "../src/page-architecture.js"

const validHelloPage = `
import { Button } from "@backbone/design-system"
import type { Page } from "../page"

export type HelloPageStaticProps = {
  label: string
}

export type HelloPageDynamicProps = {
  onSubmitted(): void
}

export const helloPageDynamicPropKeys = ["onSubmitted"] as const

export const HelloPage: Page<HelloPageStaticProps, HelloPageDynamicProps> = ({
  label,
  onSubmitted,
}) => <Button onClick={onSubmitted}>{label}</Button>
`

test("accepts the app page architecture", () => {
  const result = checkPageArchitecture({
    pagesSrcDir: path.resolve("../../src/pages"),
  })

  assert.deepEqual(result.errors, [])
})

test("accepts pages that follow the named page contract", () => {
  const fixture = createFixture({
    "page.ts":
      "export type Page<StaticProps, DynamicProps> = (props: StaticProps & DynamicProps) => unknown\n",
    "hello/hello-page.tsx": validHelloPage,
  })

  try {
    const result = checkPageArchitecture({ pagesSrcDir: fixture.pagesSrcDir })

    assert.deepEqual(result.errors, [])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects pages missing named exports", () => {
  const fixture = createFixture({
    "hello/hello-page.tsx": `
      import type { Page } from "../page"
      export type StaticProps = { label: string }
      export type DynamicProps = { onSubmitted(): void }
      export const HelloPage: Page<StaticProps, DynamicProps> = () => null
    `,
  })

  try {
    const result = checkPageArchitecture({ pagesSrcDir: fixture.pagesSrcDir })

    assert.deepEqual(result.errors, [
      'Page file "hello/hello-page.tsx" must export type "HelloPageStaticProps".',
      'Page file "hello/hello-page.tsx" must export type "HelloPageDynamicProps".',
      'Page file "hello/hello-page.tsx" must export const "helloPageDynamicPropKeys".',
      'Page component "HelloPage" in "hello/hello-page.tsx" must be typed as "Page<HelloPageStaticProps, HelloPageDynamicProps>".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects dynamic props that are not on-prefixed callbacks", () => {
  const fixture = createFixture({
    "hello/hello-page.tsx": `
      import type { Page } from "../page"
      export type HelloPageStaticProps = { label: string }
      export type HelloPageDynamicProps = {
        submitted(): void
        isSubmitting: boolean
      }
      export const helloPageDynamicPropKeys = ["submitted", "isSubmitting"] as const
      export const HelloPage: Page<HelloPageStaticProps, HelloPageDynamicProps> = () => null
    `,
  })

  try {
    const result = checkPageArchitecture({ pagesSrcDir: fixture.pagesSrcDir })

    assert.deepEqual(result.errors, [
      'Dynamic prop "submitted" in "hello/hello-page.tsx" must start with "on" followed by an uppercase letter.',
      'Dynamic prop "isSubmitting" in "hello/hello-page.tsx" must be a function callback.',
      'Dynamic prop "isSubmitting" in "hello/hello-page.tsx" must start with "on" followed by an uppercase letter.',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects dynamic prop key mismatches", () => {
  const fixture = createFixture({
    "hello/hello-page.tsx": `
      import type { Page } from "../page"
      export type HelloPageStaticProps = { label: string }
      export type HelloPageDynamicProps = {
        onSubmitted(): void
        onCancelled(): void
      }
      export const helloPageDynamicPropKeys = ["onSubmitted", "onUnknown"] as const
      export const HelloPage: Page<HelloPageStaticProps, HelloPageDynamicProps> = () => null
    `,
  })

  try {
    const result = checkPageArchitecture({ pagesSrcDir: fixture.pagesSrcDir })

    assert.deepEqual(result.errors, [
      'Dynamic prop keys in "hello/hello-page.tsx" must include "onCancelled".',
      'Dynamic prop keys in "hello/hello-page.tsx" must not include unknown key "onUnknown".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects page template imports outside the page boundary", () => {
  const fixture = createFixture({
    "hello/hello-page.tsx": `
      import { Button } from "@backbone/design-system"
      import type { Page } from "../page"
      import { createClient } from "@connectrpc/connect"
      import { helper } from "./helper"
      export type HelloPageStaticProps = { label: string }
      export type HelloPageDynamicProps = { onSubmitted(): void }
      export const helloPageDynamicPropKeys = ["onSubmitted"] as const
      export const HelloPage: Page<HelloPageStaticProps, HelloPageDynamicProps> = () => null
    `,
  })

  try {
    const result = checkPageArchitecture({ pagesSrcDir: fixture.pagesSrcDir })

    assert.deepEqual(result.errors, [
      'Page file "hello/hello-page.tsx" must not import "@connectrpc/connect"; page templates may only import @backbone/design-system and ../page.',
      'Page file "hello/hello-page.tsx" must not import "./helper"; page templates may only import @backbone/design-system and ../page.',
    ])
  } finally {
    removeFixture(fixture)
  }
})

function createFixture(files: Record<string, string>) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "backbone-page-architecture-"))
  const pagesSrcDir = path.join(rootDir, "pages")

  writeFiles(pagesSrcDir, files)

  return { pagesSrcDir, rootDir }
}

function writeFiles(rootDir: string, files: Record<string, string>) {
  for (const [filePath, content] of Object.entries(files)) {
    const absolutePath = path.join(rootDir, filePath)

    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, content)
  }
}

function removeFixture(fixture: { rootDir: string }) {
  fs.rmSync(fixture.rootDir, { force: true, recursive: true })
}
