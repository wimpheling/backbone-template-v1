import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

type OxlintDiagnostic = {
  code?: string
  filename?: string
  labels?: Array<{
    span?: {
      column?: number
      line?: number
    }
  }>
  message?: string
}

type OxlintJsonOutput = {
  diagnostics?: OxlintDiagnostic[]
}

const packageRoot = process.cwd()

test("valid Gherkin-backed Playwright specs pass real oxlint", () => {
  const fixture = createFixture({
    feature: `Feature: Greeting

  @id:greeting.say-hello
  Scenario: Say hello
    Given the visitor is on the hello page
    When they ask to greet Playwright
    Then they see the Playwright greeting
`,
    spec: `import { feature } from "../../support/gherkin"

feature("../features/greeting.feature", {
  "greeting.say-hello": async ({ scenario }) => {
    await scenario.step("Given the visitor is on the hello page", async () => {})
    await scenario.step("When they ask to greet Playwright", async () => {})
    await scenario.step("Then they see the Playwright greeting", async () => {})
  },
})
`,
  })

  try {
    const result = runOxlint(fixture.path)

    assert.equal(result.status, 0)
    assert.deepEqual(result.diagnostics, [])
  } finally {
    fixture.dispose()
  }
})

test("drift between Gherkin and Playwright specs reports stable oxlint diagnostics", () => {
  const fixture = createFixture({
    feature: `Feature: Greeting

  @id:greeting.say-hello
  Scenario: Say hello
    Given the visitor is on the hello page
    When they ask to greet Playwright
    Then they see the Playwright greeting
`,
    spec: `import { feature } from "../../support/gherkin"

feature("../features/greeting.feature", {
  "greeting.say-hello": async ({ scenario }) => {
    await scenario.step("Given the visitor is on the hello page", async () => {})
    await scenario.step("Then they see the Playwright greeting", async () => {})
  },
  "greeting.extra": async ({ scenario }) => {
    await scenario.step("Given an extra implementation", async () => {})
  },
})
`,
  })

  try {
    const result = runOxlint(fixture.path)

    assert.equal(result.status, 1)
    assert.deepEqual(
      result.diagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        column: diagnostic.column,
        file: path.basename(diagnostic.filename ?? ""),
        line: diagnostic.line,
        message: diagnostic.message,
      })),
      [
        {
          code: "backbone-e2e/valid-gherkin-feature",
          column: 3,
          file: "greeting.spec.ts",
          line: 4,
          message:
            'missing implemented step for "greeting.say-hello" from ' +
            `${path.join(fixture.path, "features/greeting.feature")}:4: ` +
            '"When they ask to greet Playwright".',
        },
        {
          code: "backbone-e2e/valid-gherkin-feature",
          column: 3,
          file: "greeting.spec.ts",
          line: 8,
          message: 'implementation id "greeting.extra" has no matching scenario.',
        },
      ],
    )
  } finally {
    fixture.dispose()
  }
})

test("renamed scenario.step labels report missing and unexpected step diagnostics", () => {
  const fixture = createFixture({
    feature: `Feature: Greeting

  @id:greeting.say-hello
  Scenario: Say hello
    Given the visitor is on the hello page
    When they ask to greet Playwright
    Then they see the Playwright greeting
`,
    spec: `import { feature } from "../../support/gherkin"

feature("../features/greeting.feature", {
  "greeting.say-hello": async ({ scenario }) => {
    await scenario.step("Given the visitor is on the hello page", async () => {})
    await scenario.step("When they ask to greet Cypress", async () => {})
    await scenario.step("Then they see the Playwright greeting", async () => {})
  },
})
`,
  })

  try {
    const result = runOxlint(fixture.path)

    assert.equal(result.status, 1)
    assert.deepEqual(
      result.diagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        column: diagnostic.column,
        file: path.basename(diagnostic.filename ?? ""),
        line: diagnostic.line,
        message: diagnostic.message,
      })),
      [
        {
          code: "backbone-e2e/valid-gherkin-feature",
          column: 3,
          file: "greeting.spec.ts",
          line: 4,
          message:
            'missing implemented step for "greeting.say-hello" from ' +
            `${path.join(fixture.path, "features/greeting.feature")}:4: ` +
            '"When they ask to greet Playwright".',
        },
        {
          code: "backbone-e2e/valid-gherkin-feature",
          column: 25,
          file: "greeting.spec.ts",
          line: 6,
          message:
            'unexpected implemented step for "greeting.say-hello": ' +
            '"When they ask to greet Cypress". No step with this label exists in the feature scenario.',
        },
      ],
    )
  } finally {
    fixture.dispose()
  }
})

test("extra scenario.step labels report implementation and step diagnostics", () => {
  const fixture = createFixture({
    feature: `Feature: Greeting

  @id:greeting.say-hello
  Scenario: Say hello
    Given the visitor is on the hello page
    When they ask to greet Playwright
    Then they see the Playwright greeting
`,
    spec: `import { feature } from "../../support/gherkin"

feature("../features/greeting.feature", {
  "greeting.say-hello": async ({ scenario }) => {
    await scenario.step("Given the visitor is on the hello page", async () => {})
    await scenario.step("When they ask to greet Playwright", async () => {})
    await scenario.step("Then they see an extra Cypress greeting", async () => {})
    await scenario.step("Then they see the Playwright greeting", async () => {})
  },
})
`,
  })

  try {
    const result = runOxlint(fixture.path)

    assert.equal(result.status, 1)
    assert.deepEqual(
      result.diagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        column: diagnostic.column,
        file: path.basename(diagnostic.filename ?? ""),
        line: diagnostic.line,
        message: diagnostic.message,
      })),
      [
        {
          code: "backbone-e2e/valid-gherkin-feature",
          column: 3,
          file: "greeting.spec.ts",
          line: 4,
          message:
            'extra implemented step(s) for "greeting.say-hello" not present in ' +
            `${path.join(fixture.path, "features/greeting.feature")}:4: ` +
            '"Then they see an extra Cypress greeting".',
        },
        {
          code: "backbone-e2e/valid-gherkin-feature",
          column: 25,
          file: "greeting.spec.ts",
          line: 7,
          message:
            'unexpected implemented step for "greeting.say-hello": ' +
            '"Then they see an extra Cypress greeting". ' +
            "No step with this label exists in the feature scenario.",
        },
      ],
    )
  } finally {
    fixture.dispose()
  }
})

function createFixture(files: { feature: string; spec: string }) {
  const fixturePath = fs.mkdtempSync(path.join(os.tmpdir(), "backbone-e2e-oxlint-"))

  fs.mkdirSync(path.join(fixturePath, "features"))
  fs.mkdirSync(path.join(fixturePath, "tests"))
  fs.writeFileSync(path.join(fixturePath, "features/greeting.feature"), files.feature)
  fs.writeFileSync(path.join(fixturePath, "tests/greeting.spec.ts"), files.spec)
  fs.writeFileSync(
    path.join(fixturePath, "oxlint.json"),
    JSON.stringify({
      jsPlugins: [path.join(packageRoot, "support/dist/oxlint-plugin.js")],
      rules: {
        "backbone-e2e/valid-gherkin-feature": "error",
      },
    }),
  )

  return {
    path: fixturePath,
    dispose() {
      fs.rmSync(fixturePath, { force: true, recursive: true })
    },
  }
}

function runOxlint(fixturePath: string) {
  const result = spawnSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    [
      "exec",
      "oxlint",
      "--config",
      path.join(fixturePath, "oxlint.json"),
      "--format",
      "json",
      path.join(fixturePath, "tests"),
    ],
    {
      cwd: packageRoot,
      encoding: "utf8",
    },
  )

  if (result.error !== undefined && result.status === null) {
    throw result.error
  }

  return {
    diagnostics: parseDiagnostics(result.stdout),
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

function parseDiagnostics(output: string) {
  if (output.trim() === "") {
    return []
  }

  const parsed = JSON.parse(output) as OxlintJsonOutput

  return (parsed.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.code?.startsWith("backbone-e2e"))
    .map((diagnostic) => ({
      code: normalizeRuleCode(diagnostic.code),
      column: diagnostic.labels?.[0]?.span?.column,
      filename: diagnostic.filename,
      line: diagnostic.labels?.[0]?.span?.line,
      message: diagnostic.message,
    }))
    .sort((left, right) => {
      const leftLine = left.line ?? 0
      const rightLine = right.line ?? 0

      if (leftLine !== rightLine) {
        return leftLine - rightLine
      }

      return (left.message ?? "").localeCompare(right.message ?? "")
    })
}

function normalizeRuleCode(code: string | undefined) {
  return code?.replace(/^backbone-e2e\((.+)\)$/, "backbone-e2e/$1")
}
