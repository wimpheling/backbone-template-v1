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
    message?: string
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

test("fixture files without boundary violations pass real Oxlint", () => {
  const result = runOxlint("fixtures/valid")

  assert.equal(result.status, 0)
  assert.deepEqual(result.diagnostics, [])
})

test("fixture files with boundary violations report stable diagnostics", () => {
  const result = runOxlint("fixtures/invalid")

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
        code: "backbone-design-system/no-external-ui-imports",
        column: 24,
        file: "external-ui-import.tsx",
        line: 1,
        message: 'Import "@mui/material" bypasses the design system boundary.',
      },
      {
        code: "backbone-design-system/no-raw-dom-jsx",
        column: 11,
        file: "raw-dom-jsx.tsx",
        line: 2,
        message:
          "Raw JSX element <button> is not allowed in app code; use @backbone/design-system components.",
      },
      {
        code: "backbone-design-system/no-raw-error-message",
        column: 18,
        file: "raw-error-message.ts",
        line: 5,
        message: "Use the RPC error mapper instead of direct Error.message access.",
      },
      {
        code: "backbone-design-system/no-external-ui-imports",
        column: 20,
        file: "two-violations.tsx",
        line: 1,
        message: 'Import "styled-components" bypasses the design system boundary.',
      },
      {
        code: "backbone-design-system/no-raw-dom-jsx",
        column: 11,
        file: "two-violations.tsx",
        line: 6,
        message:
          "Raw JSX element <main> is not allowed in app code; use @backbone/design-system components.",
      },
    ],
  )
})

function runOxlint(fixturePath: string) {
  const { configDir, configPath } = writeOxlintConfig()

  try {
    const result = spawnSync(
      process.platform === "win32" ? "pnpm.cmd" : "pnpm",
      ["exec", "oxlint", "--config", configPath, "--format", "json", fixturePath],
      {
        cwd: packageRoot,
        encoding: "utf8",
      },
    )

    if (result.error !== undefined && result.status === null) {
      throw result.error
    }

    const diagnostics = parseDiagnostics(result.stdout)

    return {
      diagnostics,
      status: result.status,
      stderr: result.stderr,
      stdout: result.stdout,
    }
  } finally {
    fs.rmSync(configDir, { force: true, recursive: true })
  }
}

function writeOxlintConfig() {
  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), "backbone-design-system-oxlint-"))
  const configPath = path.join(configDir, "oxlint.json")

  fs.writeFileSync(
    configPath,
    JSON.stringify({
      jsPlugins: [path.join(packageRoot, "dist/src/oxlint-plugin.js")],
      rules: {
        "backbone-design-system/no-external-ui-imports": "error",
        "backbone-design-system/no-raw-dom-jsx": "error",
        "backbone-design-system/no-raw-error-message": "error",
      },
    }),
  )

  return { configDir, configPath }
}

function parseDiagnostics(output: string) {
  if (output.trim() === "") {
    return []
  }

  const parsed = JSON.parse(output) as OxlintJsonOutput

  return (parsed.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.code?.startsWith("backbone-design-system"))
    .map((diagnostic) => ({
      code: normalizeRuleCode(diagnostic.code),
      column: diagnostic.labels?.[0]?.span?.column,
      filename: diagnostic.filename,
      line: diagnostic.labels?.[0]?.span?.line,
      message: diagnostic.message ?? diagnostic.labels?.[0]?.message,
    }))
    .sort((left, right) => {
      const leftFile = left.filename ?? ""
      const rightFile = right.filename ?? ""

      if (leftFile !== rightFile) {
        return leftFile.localeCompare(rightFile)
      }

      return (left.code ?? "").localeCompare(right.code ?? "")
    })
}

function normalizeRuleCode(code: string | undefined) {
  return code?.replace(/^backbone-design-system\((.+)\)$/, "backbone-design-system/$1")
}
