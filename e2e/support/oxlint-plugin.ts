import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { generateMessages } from "@cucumber/gherkin"
import { IdGenerator, SourceMediaType, type Scenario as GherkinScenario } from "@cucumber/messages"

type RuleContext = {
  cwd: string
  filename: string
  report(report: { message: string; node: AstNode }): void
  sourceCode?: {
    ast: unknown
  }
}

type RuleModule = {
  meta: {
    docs: {
      description: string
    }
    type: "problem"
  }
  create(context: RuleContext): Record<"CallExpression", (node: AstNode) => void>
}

type AstNode = {
  type: string
  [key: string]: unknown
}

type FeatureScenario = {
  id: string
  location: string
  name: string
  steps: string[]
}

type Implementation = {
  id: string
  keyNode: AstNode
  steps: ImplementedStep[]
}

type ImplementedStep = {
  name: string
  node: AstNode
}

const idTagPrefix = "@id:"

const validGherkinFeature: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Validate that Playwright feature(...) implementations match their Gherkin files.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isIdentifier(node["callee"], "feature")) {
          return
        }

        lintFeatureCall(context, node)
      },
    }
  },
}

export default {
  meta: {
    name: "backbone-e2e",
  },
  rules: {
    "valid-gherkin-feature": validGherkinFeature,
  },
}

function lintFeatureCall(context: RuleContext, node: AstNode): void {
  const [featurePathArgument, implementationsArgument] =
    (node["arguments"] as unknown[] | undefined) ?? []

  if (!isStringLiteral(featurePathArgument)) {
    report(context, node, "feature(...) must use a string literal feature path.")
    return
  }

  if (!isObjectExpression(implementationsArgument)) {
    report(context, node, "feature(...) must use an object literal implementation map.")
    return
  }

  const featurePath = path.resolve(path.dirname(context.filename), featurePathArgument.value)

  if (!existsSync(featurePath)) {
    report(context, featurePathArgument, `Feature file does not exist: ${featurePath}.`)
    return
  }

  const scenarios = parseFeatureFile(featurePath, context, featurePathArgument)
  const implementations = parseImplementationMap(context, implementationsArgument)

  lintImplementationCoverage(context, scenarios, implementations)
}

function parseFeatureFile(
  featurePath: string,
  context: RuleContext,
  reportNode: AstNode,
): FeatureScenario[] {
  const source = readFileSync(featurePath, "utf8")
  const envelopes = generateMessages(
    source,
    featurePath,
    SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
    {
      includeGherkinDocument: true,
      includePickles: false,
      includeSource: false,
      newId: IdGenerator.incrementing(),
    },
  )

  for (const envelope of envelopes) {
    if (envelope.parseError) {
      report(context, reportNode, envelope.parseError.message)
    }
  }

  const feature = envelopes.find((envelope) => envelope.gherkinDocument)?.gherkinDocument?.feature

  if (!feature) {
    return []
  }

  const scenarios: FeatureScenario[] = []

  for (const child of feature.children) {
    if (child.scenario) {
      scenarios.push(parseScenario(featurePath, child.scenario, context, reportNode))
    }

    if (child.rule) {
      for (const ruleChild of child.rule.children) {
        if (ruleChild.scenario) {
          scenarios.push(parseScenario(featurePath, ruleChild.scenario, context, reportNode))
        }
      }
    }
  }

  lintDuplicateScenarioIds(context, reportNode, scenarios)

  return scenarios
}

function parseScenario(
  featurePath: string,
  scenario: GherkinScenario,
  context: RuleContext,
  reportNode: AstNode,
): FeatureScenario {
  const idTags = scenario.tags
    .map((tag) => tag.name)
    .filter((tagName) => tagName.startsWith(idTagPrefix))
  const location = `${featurePath}:${scenario.location.line}`

  if (scenario.keyword === "Scenario Outline") {
    report(context, reportNode, `${location} uses Scenario Outline, which is not supported.`)
  }

  if (idTags.length !== 1) {
    report(
      context,
      reportNode,
      `${location} must have exactly one ${idTagPrefix} tag, found ${idTags.length}.`,
    )
  }

  return {
    id: idTags[0]?.slice(idTagPrefix.length) ?? "",
    location,
    name: scenario.name,
    steps: scenario.steps.map((step) => `${step.keyword}${step.text}`),
  }
}

function lintDuplicateScenarioIds(
  context: RuleContext,
  reportNode: AstNode,
  scenarios: FeatureScenario[],
): void {
  const scenariosById = new Map<string, FeatureScenario[]>()

  for (const scenario of scenarios) {
    if (scenario.id === "") {
      continue
    }

    const scenariosWithId = scenariosById.get(scenario.id) ?? []
    scenariosWithId.push(scenario)
    scenariosById.set(scenario.id, scenariosWithId)
  }

  for (const [id, scenariosWithId] of scenariosById) {
    if (scenariosWithId.length <= 1) {
      continue
    }

    const firstScenario = scenariosWithId[0]
    const duplicateScenario = scenariosWithId[1]

    if (firstScenario === undefined || duplicateScenario === undefined) {
      continue
    }

    report(
      context,
      reportNode,
      `Duplicate scenario id "${id}" at ${duplicateScenario.location}; first used at ${firstScenario.location}.`,
    )
  }
}

function parseImplementationMap(
  context: RuleContext,
  implementationsArgument: AstNode,
): Implementation[] {
  const implementations: Implementation[] = []

  for (const property of (implementationsArgument["properties"] as unknown[] | undefined) ?? []) {
    if (!isProperty(property)) {
      report(
        context,
        implementationsArgument,
        "implementation map entries must be property assignments.",
      )
      continue
    }

    const id = propertyNameText(property.key)

    if (!id) {
      report(context, property.key, "implementation ids must be string literal property names.")
      continue
    }

    if (!isFunctionExpression(property.value)) {
      report(context, property.value, `implementation "${id}" must be a function.`)
      continue
    }

    implementations.push({
      id,
      keyNode: property.key,
      steps: readScenarioSteps(context, property.value),
    })
  }

  return implementations
}

function readScenarioSteps(context: RuleContext, implementation: AstNode): ImplementedStep[] {
  const steps: ImplementedStep[] = []

  visit(implementation, (node) => {
    if (!isScenarioStepCall(node)) {
      return
    }

    const [stepName] = (node["arguments"] as unknown[] | undefined) ?? []

    if (!isStringLiteral(stepName)) {
      report(context, node, "scenario.step(...) must use a string literal step name.")
      return
    }

    steps.push({
      name: stepName.value,
      node: stepName,
    })
  })

  return steps
}

function lintImplementationCoverage(
  context: RuleContext,
  scenarios: FeatureScenario[],
  implementations: Implementation[],
): void {
  const implementationsById = new Map(
    implementations.map((implementation) => [implementation.id, implementation]),
  )
  const scenariosById = new Map(scenarios.map((scenario) => [scenario.id, scenario]))

  for (const scenario of scenarios) {
    if (scenario.id === "") {
      continue
    }

    const implementation = implementationsById.get(scenario.id)

    if (!implementation) {
      report(
        context,
        implementations[0]?.keyNode ?? contextNode(context),
        `scenario "${scenario.name}" has no implementation for id "${scenario.id}".`,
      )
      continue
    }

    lintScenarioSteps(context, scenario, implementation)
  }

  for (const implementation of implementations) {
    if (!scenariosById.has(implementation.id)) {
      report(
        context,
        implementation.keyNode,
        `implementation id "${implementation.id}" has no matching scenario.`,
      )
    }
  }
}

function lintScenarioSteps(
  context: RuleContext,
  scenario: FeatureScenario,
  implementation: Implementation,
): void {
  const remainingImplementedSteps = countValues(implementation.steps.map((step) => step.name))
  const missingSteps: string[] = []

  for (const expectedStep of scenario.steps) {
    const remainingCount = remainingImplementedSteps.get(expectedStep) ?? 0

    if (remainingCount > 0) {
      remainingImplementedSteps.set(expectedStep, remainingCount - 1)
    } else {
      missingSteps.push(expectedStep)
      report(
        context,
        implementation.keyNode,
        `missing implemented step for "${scenario.id}" from ${scenario.location}: ${quote(expectedStep)}.`,
      )
    }
  }

  const remainingExpectedSteps = countValues(scenario.steps)
  const unexpectedSteps: ImplementedStep[] = []

  for (const implementedStep of implementation.steps) {
    const remainingCount = remainingExpectedSteps.get(implementedStep.name) ?? 0

    if (remainingCount > 0) {
      remainingExpectedSteps.set(implementedStep.name, remainingCount - 1)
    } else {
      unexpectedSteps.push(implementedStep)
    }
  }

  if (missingSteps.length === 0 && unexpectedSteps.length > 0) {
    report(
      context,
      implementation.keyNode,
      `extra implemented step(s) for "${scenario.id}" not present in ${scenario.location}: ` +
        `${unexpectedSteps.map((step) => quote(step.name)).join(", ")}.`,
    )
  }

  for (const unexpectedStep of unexpectedSteps) {
    report(
      context,
      unexpectedStep.node,
      `unexpected implemented step for "${scenario.id}": ${quote(unexpectedStep.name)}. ` +
        "No step with this label exists in the feature scenario.",
    )
  }
}

function countValues(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return counts
}

function isScenarioStepCall(node: AstNode): boolean {
  if (node.type !== "CallExpression" || !isNode(node["callee"])) {
    return false
  }

  const callee = node["callee"]

  return (
    callee.type === "MemberExpression" &&
    callee["computed"] === false &&
    isIdentifier(callee["object"], "scenario") &&
    isIdentifier(callee["property"], "step")
  )
}

function isIdentifier(value: unknown, name: string): value is AstNode {
  return isNode(value) && value.type === "Identifier" && value["name"] === name
}

function isStringLiteral(value: unknown): value is AstNode & { value: string } {
  return isNode(value) && value.type === "Literal" && typeof value["value"] === "string"
}

function isObjectExpression(value: unknown): value is AstNode {
  return isNode(value) && value.type === "ObjectExpression"
}

function isProperty(value: unknown): value is AstNode & { key: AstNode; value: AstNode } {
  return (
    isNode(value) && value.type === "Property" && isNode(value["key"]) && isNode(value["value"])
  )
}

function isFunctionExpression(value: unknown): boolean {
  return (
    isNode(value) &&
    (value.type === "ArrowFunctionExpression" || value.type === "FunctionExpression")
  )
}

function propertyNameText(name: AstNode): string | undefined {
  if (isStringLiteral(name)) {
    return name.value
  }

  return undefined
}

function visit(node: AstNode, callback: (node: AstNode) => void, seen = new Set<AstNode>()): void {
  if (seen.has(node)) {
    return
  }

  seen.add(node)
  callback(node)

  for (const [key, value] of Object.entries(node)) {
    if (key === "parent" || key === "loc" || key === "range" || key === "start" || key === "end") {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          visit(item, callback, seen)
        }
      }
    } else if (isNode(value)) {
      visit(value, callback, seen)
    }
  }
}

function isNode(value: unknown): value is AstNode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  )
}

function report(context: RuleContext, node: AstNode, message: string): void {
  context.report({ node, message })
}

function contextNode(context: RuleContext): AstNode {
  return context.sourceCode?.ast as AstNode
}

function quote(value: string): string {
  return `"${value}"`
}
