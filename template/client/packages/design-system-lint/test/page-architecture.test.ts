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

const validHelloPageRoute = `
import { HelloPage } from "./hello-page"
import { useHelloPageStore } from "./hello-page-state"

export function HelloPageRoute() {
  const label = useHelloPageStore((state) => state.label)
  const onSubmitted = useHelloPageStore((state) => state.onSubmitted)

  return <HelloPage label={label} onSubmitted={onSubmitted} />
}
`

const validHelloPageState = `
import { create } from "zustand"

export const useHelloPageStore = create(() => ({
  label: "Submit",
  onSubmitted() {},
}))
`

test("accepts the app page architecture", () => {
  const result = checkPageArchitecture({
    appSrcFile: path.resolve("../../src/App.tsx"),
    pagesSrcDir: path.resolve("../../src/pages"),
  })

  assert.deepEqual(result.errors, [])
})

test("accepts pages that follow the named page contract", () => {
  const fixture = createFixture({
    "page.ts":
      "export type Page<StaticProps, DynamicProps> = (props: StaticProps & DynamicProps) => unknown\n",
    "hello/hello-page.tsx": validHelloPage,
    "hello/hello-page-route.tsx": validHelloPageRoute,
    "hello/hello-page-state.ts": validHelloPageState,
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
    "hello/hello-page-route.tsx": validHelloPageRoute,
    "hello/hello-page-state.ts": validHelloPageState,
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
    "hello/hello-page-route.tsx": validHelloPageRoute,
    "hello/hello-page-state.ts": validHelloPageState,
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
    "hello/hello-page-route.tsx": validHelloPageRoute,
    "hello/hello-page-state.ts": validHelloPageState,
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
    "hello/hello-page-route.tsx": validHelloPageRoute,
    "hello/hello-page-state.ts": validHelloPageState,
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

test("rejects missing page route and state companion files", () => {
  const fixture = createFixture({
    "hello/hello-page.tsx": validHelloPage,
  })

  try {
    const result = checkPageArchitecture({ pagesSrcDir: fixture.pagesSrcDir })

    assert.deepEqual(result.errors, [
      'Page "hello/hello-page.tsx" must have a sibling route adapter "hello-page-route.tsx".',
      'Page "hello/hello-page.tsx" must have a sibling Zustand state file "hello-page-state.ts".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects page route adapters that bypass the page/state boundary", () => {
  const fixture = createFixture({
    "hello/hello-page.tsx": validHelloPage,
    "hello/hello-page-route.tsx": `
      import { Button } from "@backbone/design-system"
      import { HelloPage } from "./hello-page"
      export function HelloPageRoute() {
        return <Button>Submit</Button>
      }
    `,
    "hello/hello-page-state.ts": validHelloPageState,
  })

  try {
    const result = checkPageArchitecture({ pagesSrcDir: fixture.pagesSrcDir })

    assert.deepEqual(result.errors, [
      'Page route adapter "hello/hello-page-route.tsx" must not import @backbone/design-system; keep UI composition in "hello-page.tsx".',
      'Page route adapter "hello/hello-page-route.tsx" must import "./hello-page-state".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects page state files that depend on UI or omit Zustand", () => {
  const fixture = createFixture({
    "hello/hello-page.tsx": validHelloPage,
    "hello/hello-page-route.tsx": validHelloPageRoute,
    "hello/hello-page-state.ts": `
      import { Button } from "@backbone/design-system"
      import { HelloPage } from "./hello-page"
      export const state = { label: "Submit" }
    `,
  })

  try {
    const result = checkPageArchitecture({ pagesSrcDir: fixture.pagesSrcDir })

    assert.deepEqual(result.errors, [
      'Page state file "hello/hello-page-state.ts" must not import @backbone/design-system; keep UI composition in "hello-page.tsx".',
      'Page state file "hello/hello-page-state.ts" must not import "./hello-page"; page state must stay independent from UI components.',
      'Page state file "hello/hello-page-state.ts" must import "zustand".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects App.tsx imports that place state or design-system work in the app shell", () => {
  const fixture = createFixture({
    "hello/hello-page.tsx": validHelloPage,
    "hello/hello-page-route.tsx": validHelloPageRoute,
    "hello/hello-page-state.ts": validHelloPageState,
  })

  try {
    const appSrcFile = path.join(fixture.rootDir, "App.tsx")

    fs.writeFileSync(
      appSrcFile,
      `
        import { Navigation } from "@backbone/design-system"
        import { createClient } from "@connectrpc/connect"
        import { useState } from "react"
        import { HelloPage } from "./pages/hello/hello-page"
        export function App() {
          const [name] = useState("World")
          return <HelloPage />
        }
      `,
    )

    const result = checkPageArchitecture({ appSrcFile, pagesSrcDir: fixture.pagesSrcDir })

    assert.deepEqual(result.errors, [
      'App file "App.tsx" must not import @backbone/design-system; render design-system components from page templates or app shell components.',
      'App file "App.tsx" must not import "@connectrpc/connect"; page state belongs in sibling page state files.',
      'App file "App.tsx" must not import React hook "useState"; route/page state belongs in page route and state files.',
      'App file "App.tsx" must import a page route adapter instead of "./pages/hello/hello-page".',
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
