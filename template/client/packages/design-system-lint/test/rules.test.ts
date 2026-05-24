import assert from "node:assert/strict"
import test from "node:test"
import { noExternalUiImports, noRawDomJsx } from "../src/rules.js"

type RuleReport = {
  message: string
  node: unknown
}

function runRule<VisitorName extends string, Node>(
  rule: {
    create(context: { report(report: RuleReport): void }): Record<VisitorName, (node: Node) => void>
  },
  visitorName: VisitorName,
  node: Node,
) {
  const reports: RuleReport[] = []
  const context = {
    report(report: RuleReport) {
      reports.push(report)
    },
  }

  rule.create(context)[visitorName](node)

  return reports
}

test("no-raw-dom-jsx flags raw DOM JSX in app code", () => {
  const reports = runRule(noRawDomJsx, "JSXOpeningElement", {
    name: { type: "JSXIdentifier", name: "button" },
  })

  assert.equal(reports.length, 1)
  const report = reports[0]
  assert.ok(report)
  assert.match(report.message, /Raw JSX element <button>/)
})

test("no-raw-dom-jsx allows design system components", () => {
  const reports = runRule(noRawDomJsx, "JSXOpeningElement", {
    name: { type: "JSXIdentifier", name: "Button" },
  })

  assert.deepEqual(reports, [])
})

test("no-external-ui-imports flags direct imports from external UI libraries", () => {
  const reports = runRule(noExternalUiImports, "ImportDeclaration", {
    source: { value: "@mui/material" },
  })

  assert.equal(reports.length, 1)
  const report = reports[0]
  assert.ok(report)
  assert.match(report.message, /bypasses the design system boundary/)
})

test("no-external-ui-imports allows imports from the design system", () => {
  const reports = runRule(noExternalUiImports, "ImportDeclaration", {
    source: { value: "@backbone/design-system" },
  })

  assert.deepEqual(reports, [])
})
