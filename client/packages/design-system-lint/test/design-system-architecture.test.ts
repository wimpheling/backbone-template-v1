import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { checkDesignSystemArchitecture } from "../src/design-system-architecture.js"

test("accepts the app design-system architecture", () => {
  const result = checkDesignSystemArchitecture({
    contractSrcDir: path.resolve("../design-system-contract/src"),
    implementationSrcDir: path.resolve("../design-system-basic/src"),
  })

  assert.deepEqual(result.errors, [])
})

test("rejects missing matching contract and implementation component files", () => {
  const fixture = createFixture({
    contract: {
      "button.ts": "export type ButtonProps = unknown\nexport type ButtonComponent = unknown\n",
      "card.ts": "export type CardProps = unknown\nexport type CardComponent = unknown\n",
      "index.ts": "export type * from './button'\nexport type * from './card'\n",
    },
    implementation: {
      "button.stories.tsx": "export const Default = () => null\n",
      "button.tsx": "export const Button = () => null\n",
      "index.tsx": "export * from './button'\n",
    },
  })

  try {
    const result = checkDesignSystemArchitecture(fixture)

    assert.deepEqual(result.errors, [
      'Component "card" exists in contract but is missing from implementation.',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects implementation component files without colocated stories", () => {
  const fixture = createFixture({
    contract: {
      "button.ts": "export type ButtonProps = unknown\nexport type ButtonComponent = unknown\n",
      "index.ts": "export type * from './button'\n",
    },
    implementation: {
      "button.tsx": "export const Button = () => null\n",
      "index.tsx": "export * from './button'\n",
    },
  })

  try {
    const result = checkDesignSystemArchitecture(fixture)

    assert.deepEqual(result.errors, [
      'Implementation component "button" must have a colocated story file at "button.stories.tsx".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects contract files without matching props and component exports", () => {
  const fixture = createFixture({
    contract: {
      "button.ts": "export type ButtonComponent = unknown\nexport type ButtonConfig = unknown\n",
      "index.ts": "export type * from './button'\n",
    },
    implementation: {
      "button.stories.tsx": "export const Default = () => null\n",
      "button.tsx": "export const Button = () => null\n",
      "index.tsx": "export * from './button'\n",
    },
  })

  try {
    const result = checkDesignSystemArchitecture(fixture)

    assert.deepEqual(result.errors, [
      'Contract component file "button.ts" must export exactly "ButtonComponent" and "ButtonProps".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects multiple named exports from an implementation component file", () => {
  const fixture = createFixture({
    contract: {
      "button.ts": "export type ButtonProps = unknown\nexport type ButtonComponent = unknown\n",
      "index.ts": "export type * from './button'\n",
    },
    implementation: {
      "button.stories.tsx": "export const Default = () => null\n",
      "button.tsx": "export const Button = () => null\nexport const ButtonIcon = () => null\n",
      "index.tsx": "export * from './button'\n",
    },
  })

  try {
    const result = checkDesignSystemArchitecture(fixture)

    assert.deepEqual(result.errors, [
      'Implementation component file "button.tsx" must export exactly "Button".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects implementation exports that do not match the component file name", () => {
  const fixture = createFixture({
    contract: {
      "text-input.ts":
        "export type TextInputProps = unknown\nexport type TextInputComponent = unknown\n",
      "index.ts": "export type * from './text-input'\n",
    },
    implementation: {
      "index.tsx": "export * from './text-input'\n",
      "text-input.stories.tsx": "export const Default = () => null\n",
      "text-input.tsx": "export const Input = () => null\n",
    },
  })

  try {
    const result = checkDesignSystemArchitecture(fixture)

    assert.deepEqual(result.errors, [
      'Implementation component file "text-input.tsx" must export exactly "TextInput".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects mismatched subfolder structure", () => {
  const fixture = createFixture({
    contract: {
      "forms/button.ts":
        "export type ButtonProps = unknown\nexport type ButtonComponent = unknown\n",
      "index.ts": "export type * from './forms/button'\n",
    },
    implementation: {
      "button.stories.tsx": "export const Default = () => null\n",
      "button.tsx": "export const Button = () => null\n",
      "index.tsx": "export * from './button'\n",
    },
  })

  try {
    const result = checkDesignSystemArchitecture(fixture)

    assert.deepEqual(result.errors, [
      'Component "button" exists in implementation but is missing from contract.',
      'Component "forms/button" exists in contract but is missing from implementation.',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects missing barrel exports", () => {
  const fixture = createFixture({
    contract: {
      "button.ts": "export type ButtonProps = unknown\nexport type ButtonComponent = unknown\n",
      "text-input.ts":
        "export type TextInputProps = unknown\nexport type TextInputComponent = unknown\n",
      "index.ts": "export type * from './button'\n",
    },
    implementation: {
      "button.stories.tsx": "export const Default = () => null\n",
      "button.tsx": "export const Button = () => null\n",
      "index.tsx": "export * from './button'\n",
      "text-input.stories.tsx": "export const Default = () => null\n",
      "text-input.tsx": "export const TextInput = () => null\n",
    },
  })

  try {
    const result = checkDesignSystemArchitecture(fixture)

    assert.deepEqual(result.errors, [
      'Contract barrel "index.ts" must export "./text-input".',
      'Implementation barrel "index.tsx" must export "./text-input".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

test("rejects extra barrel exports", () => {
  const fixture = createFixture({
    contract: {
      "button.ts": "export type ButtonProps = unknown\nexport type ButtonComponent = unknown\n",
      "index.ts": "export type * from './button'\nexport type * from './card'\n",
    },
    implementation: {
      "button.stories.tsx": "export const Default = () => null\n",
      "button.tsx": "export const Button = () => null\n",
      "index.tsx": "export * from './button'\nexport * from './button.stories'\n",
    },
  })

  try {
    const result = checkDesignSystemArchitecture(fixture)

    assert.deepEqual(result.errors, [
      'Contract barrel "index.ts" must not export "./card".',
      'Implementation barrel "index.tsx" must not export "./button.stories".',
    ])
  } finally {
    removeFixture(fixture)
  }
})

function createFixture(files: {
  contract: Record<string, string>
  implementation: Record<string, string>
}) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "backbone-design-system-architecture-"))
  const contractSrcDir = path.join(rootDir, "contract")
  const implementationSrcDir = path.join(rootDir, "implementation")

  writeFiles(contractSrcDir, files.contract)
  writeFiles(implementationSrcDir, files.implementation)

  return { contractSrcDir, implementationSrcDir, rootDir }
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
