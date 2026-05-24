import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"

const fixtureConfig = "support/gherkin-fixtures/playwright.config.ts"

type FixtureResult = {
  status: number | null
  output: string
}

type FixtureCase = {
  fixture: string
  name: string
  assertResult: (result: FixtureResult) => void
}

const fixtureCases: FixtureCase[] = [
  {
    fixture: "happy-path",
    name: "passes when Gherkin and implementation steps match",
    assertResult(result) {
      assert.equal(result.status, 0, result.output)
    },
  },
  {
    fixture: "step-mismatch",
    name: "fails when an implementation step name differs from Gherkin",
    assertResult(result) {
      assert.notEqual(result.status, 0)
      assert.match(result.output, /Step mismatch/)
      assert.match(result.output, /Expected \\"Given the documented step name\\"/)
    },
  },
  {
    fixture: "missing-step",
    name: "fails when a Gherkin step is not implemented",
    assertResult(result) {
      assert.notEqual(result.status, 0)
      assert.match(result.output, /Missing implemented step\(s\)/)
      assert.match(result.output, /Given the documented step is not implemented/)
    },
  },
  {
    fixture: "extra-step",
    name: "fails when the implementation has an extra step",
    assertResult(result) {
      assert.notEqual(result.status, 0)
      assert.match(result.output, /Unexpected extra step/)
      assert.match(result.output, /Then an extra implementation step runs/)
    },
  },
  {
    fixture: "missing-id",
    name: "fails when a scenario is missing an id tag",
    assertResult(result) {
      assert.notEqual(result.status, 0)
      assert.match(result.output, /missing a required @id: tag/)
    },
  },
  {
    fixture: "duplicate-id",
    name: "fails when scenario ids are duplicated",
    assertResult(result) {
      assert.notEqual(result.status, 0)
      assert.match(result.output, /Duplicate scenario id \\"fixture\.duplicate-id\\"/)
    },
  },
  {
    fixture: "missing-implementation",
    name: "fails when a scenario has no implementation",
    assertResult(result) {
      assert.notEqual(result.status, 0)
      assert.match(result.output, /Missing implementation\(s\)/)
      assert.match(result.output, /fixture\.missing-implementation/)
    },
  },
  {
    fixture: "extra-implementation",
    name: "fails when an implementation has no scenario",
    assertResult(result) {
      assert.notEqual(result.status, 0)
      assert.match(result.output, /Extra implementation\(s\)/)
      assert.match(result.output, /fixture\.unused-implementation/)
    },
  },
  {
    fixture: "scenario-outline",
    name: "fails when a scenario outline is used",
    assertResult(result) {
      assert.notEqual(result.status, 0)
      assert.match(result.output, /uses Scenario Outline, which is not supported/)
    },
  },
]

test("validates Gherkin adapter fixtures", async () => {
  const results = await Promise.all(
    fixtureCases.map(async (fixtureCase) => ({
      fixtureCase,
      result: await runFixture(fixtureCase.fixture),
    })),
  )

  for (const { fixtureCase, result } of results) {
    fixtureCase.assertResult(result)
  }
})

async function runFixture(name: string): Promise<FixtureResult> {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "backbone-gherkin-adapter-"))
  const jsonOutput = path.join(outputDir, "playwright-report.json")

  try {
    const result = await spawnFixture(name, jsonOutput)

    return {
      status: result.status,
      output: [
        result.error ? `${result.error}` : "",
        result.stdout,
        result.stderr,
        fs.existsSync(jsonOutput) ? fs.readFileSync(jsonOutput, "utf8") : "",
      ].join("\n"),
    }
  } finally {
    fs.rmSync(outputDir, { force: true, recursive: true })
  }
}

type SpawnFixtureResult = {
  error?: Error
  status: number | null
  stderr: string
  stdout: string
}

function spawnFixture(name: string, jsonOutput: string): Promise<SpawnFixtureResult> {
  return new Promise((resolve) => {
    const child = spawn(
      "pnpm",
      [
        "exec",
        "playwright",
        "test",
        `support/gherkin-fixtures/${name}.spec.ts`,
        "--config",
        fixtureConfig,
        "--reporter=json",
      ],
      {
        cwd: new URL("..", import.meta.url),
        env: {
          ...process.env,
          PLAYWRIGHT_JSON_OUTPUT_NAME: jsonOutput,
        },
      },
    )

    let stderr = ""
    let stdout = ""

    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk
    })

    child.stdout?.setEncoding("utf8")
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk
    })

    child.on("error", (error) => {
      resolve({ error, status: null, stderr, stdout })
    })

    child.on("close", (status) => {
      resolve({ status, stderr, stdout })
    })
  })
}
