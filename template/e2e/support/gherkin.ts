import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { generateMessages } from "@cucumber/gherkin"
import {
  IdGenerator,
  SourceMediaType,
  type Envelope,
  type Scenario as GherkinScenario,
} from "@cucumber/messages"
import {
  test as baseTest,
  type PlaywrightTestArgs,
  type PlaywrightTestOptions,
  type TestInfo,
} from "@playwright/test"

type ScenarioStep = <T>(name: string, body: () => T | Promise<T>) => Promise<T>

export type ScenarioRuntime = {
  readonly id: string
  readonly name: string
  step: ScenarioStep
}

type ScenarioImplementationArgs<ExtraArgs extends object = object> = PlaywrightTestArgs &
  Pick<PlaywrightTestOptions, "baseURL"> & {
    scenario: ScenarioRuntime
  } & ExtraArgs

export type ScenarioImplementation<ExtraArgs extends object = object> = (
  args: ScenarioImplementationArgs<ExtraArgs>,
  testInfo: TestInfo,
) => void | Promise<void>

type ScenarioDefinition = {
  id: string
  name: string
  location: string
  steps: string[]
}

const idTagPrefix = "@id:"

type FeatureTest = Pick<typeof baseTest, "describe" | "extend">

export const feature = createFeature(baseTest)

export function createFeature<ExtraArgs extends object>(test: FeatureTest) {
  return function registerFeature(
    featureFile: string,
    implementations: Record<string, ScenarioImplementation<ExtraArgs>>,
  ): void {
    const featurePath = resolveFeaturePath(featureFile)
    const parsedFeature = parseFeature(featurePath)

    validateImplementations(featurePath, parsedFeature.scenarios, implementations)

    test.describe(parsedFeature.name, () => {
      for (const scenarioDefinition of parsedFeature.scenarios) {
        const scenarioTest = test.extend<{ scenario: ScenarioRuntime }>({
          scenario: [
            // oxlint-disable-next-line no-empty-pattern -- Playwright fixtures require object destructuring here.
            async ({}, use) => {
              const scenario = createScenarioRuntime(scenarioDefinition)
              let implementationFailed = false

              try {
                await use(scenario)
              } catch (error) {
                implementationFailed = true
                throw error
              } finally {
                if (!implementationFailed) {
                  scenario.assertComplete()
                }
              }
            },
            { auto: true },
          ],
        })

        const implementation = implementations[scenarioDefinition.id]

        if (implementation === undefined) {
          throw new Error(`Missing implementation for scenario id "${scenarioDefinition.id}".`)
        }

        const runScenario = scenarioTest as unknown as (
          name: string,
          implementation: ScenarioImplementation<ExtraArgs>,
        ) => void

        runScenario(scenarioDefinition.name, implementation)
      }
    })
  }
}

function parseFeature(featurePath: string): { name: string; scenarios: ScenarioDefinition[] } {
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

  assertNoParseErrors(featurePath, envelopes)

  const gherkinDocument = envelopes.find((envelope) => envelope.gherkinDocument)?.gherkinDocument
  const gherkinFeature = gherkinDocument?.feature

  if (!gherkinFeature) {
    throw new Error(`Feature file ${featurePath} does not contain a Feature.`)
  }

  const scenarios: ScenarioDefinition[] = []

  for (const child of gherkinFeature.children) {
    if (child.background) {
      throw new Error(
        `${featurePath}:${child.background.location.line} uses Background, which is not supported.`,
      )
    }

    if (child.scenario) {
      scenarios.push(parseScenario(featurePath, child.scenario))
    }

    if (child.rule) {
      for (const ruleChild of child.rule.children) {
        if (ruleChild.background) {
          throw new Error(
            `${featurePath}:${ruleChild.background.location.line} uses Background, which is not supported.`,
          )
        }

        if (ruleChild.scenario) {
          scenarios.push(parseScenario(featurePath, ruleChild.scenario))
        }
      }
    }
  }

  assertUniqueScenarioIds(featurePath, scenarios)

  return {
    name: gherkinFeature.name,
    scenarios,
  }
}

function parseScenario(featurePath: string, scenario: GherkinScenario): ScenarioDefinition {
  if (scenario.examples.length > 0) {
    throw new Error(
      `${featurePath}:${scenario.location.line} uses Scenario Outline, which is not supported.`,
    )
  }

  const ids = scenario.tags
    .map((tag) => tag.name)
    .filter((tagName) => tagName.startsWith(idTagPrefix))
    .map((tagName) => tagName.slice(idTagPrefix.length))

  if (ids.length === 0) {
    throw new Error(
      `${featurePath}:${scenario.location.line} is missing a required ${idTagPrefix} tag.`,
    )
  }

  if (ids.length > 1) {
    throw new Error(`${featurePath}:${scenario.location.line} has multiple ${idTagPrefix} tags.`)
  }

  const [id] = ids

  if (id === undefined) {
    throw new Error(
      `${featurePath}:${scenario.location.line} is missing a required ${idTagPrefix} tag.`,
    )
  }

  return {
    id,
    name: scenario.name,
    location: `${featurePath}:${scenario.location.line}`,
    steps: scenario.steps.map((step) => `${step.keyword}${step.text}`),
  }
}

function createScenarioRuntime(
  scenarioDefinition: ScenarioDefinition,
): ScenarioRuntime & { assertComplete: () => void } {
  let nextStepIndex = 0

  return {
    id: scenarioDefinition.id,
    name: scenarioDefinition.name,
    async step<T>(name: string, body: () => T | Promise<T>): Promise<T> {
      const expectedStep = scenarioDefinition.steps[nextStepIndex]

      if (expectedStep === undefined) {
        throw new Error(
          `Unexpected extra step in ${scenarioDefinition.location}: "${name}". ` +
            `The feature only defines ${scenarioDefinition.steps.length} step(s).`,
        )
      }

      if (name !== expectedStep) {
        throw new Error(
          `Step mismatch in ${scenarioDefinition.location} at step ${nextStepIndex + 1}. ` +
            `Expected "${expectedStep}", but the implementation called "${name}".`,
        )
      }

      nextStepIndex += 1
      return baseTest.step(name, body)
    },
    assertComplete() {
      const missingSteps = scenarioDefinition.steps.slice(nextStepIndex)

      if (missingSteps.length > 0) {
        throw new Error(
          `Missing implemented step(s) in ${scenarioDefinition.location}: ${missingSteps
            .map((step) => `"${step}"`)
            .join(", ")}.`,
        )
      }
    },
  }
}

function validateImplementations(
  featurePath: string,
  scenarios: ScenarioDefinition[],
  implementations: Record<string, unknown>,
): void {
  const expectedIds = new Set(scenarios.map((scenario) => scenario.id))
  const implementedIds = new Set(Object.keys(implementations))

  const missingIds = [...expectedIds].filter((id) => !implementedIds.has(id))
  if (missingIds.length > 0) {
    throw new Error(`Missing implementation(s) for ${featurePath}: ${missingIds.join(", ")}.`)
  }

  const extraIds = [...implementedIds].filter((id) => !expectedIds.has(id))
  if (extraIds.length > 0) {
    throw new Error(`Extra implementation(s) for ${featurePath}: ${extraIds.join(", ")}.`)
  }
}

function assertUniqueScenarioIds(featurePath: string, scenarios: ScenarioDefinition[]): void {
  const seen = new Map<string, ScenarioDefinition>()

  for (const scenario of scenarios) {
    const existingScenario = seen.get(scenario.id)

    if (existingScenario) {
      throw new Error(
        `Duplicate scenario id "${scenario.id}" in ${featurePath}: ` +
          `${existingScenario.location} and ${scenario.location}.`,
      )
    }

    seen.set(scenario.id, scenario)
  }
}

function assertNoParseErrors(featurePath: string, envelopes: readonly Envelope[]): void {
  const parseErrors = envelopes
    .map((envelope) => envelope.parseError)
    .filter((parseError) => parseError !== undefined)

  if (parseErrors.length > 0) {
    throw new Error(
      `Could not parse ${featurePath}: ${parseErrors
        .map((parseError) => parseError.message)
        .join("; ")}`,
    )
  }
}

function resolveFeaturePath(featureFile: string): string {
  if (path.isAbsolute(featureFile)) {
    return featureFile
  }

  return path.resolve(path.dirname(resolveCallerPath()), featureFile)
}

function resolveCallerPath(): string {
  const stack = new Error().stack?.split("\n") ?? []

  for (const line of stack) {
    const candidate = parseStackLinePath(line)

    if (candidate && !candidate.endsWith("/support/gherkin.ts")) {
      return candidate
    }
  }

  return path.join(process.cwd(), "playwright.config.ts")
}

function parseStackLinePath(line: string): string | undefined {
  const match = line.match(/\(?((?:file:\/\/)?\/.*?):\d+:\d+\)?$/)
  const rawPath = match?.[1]

  if (!rawPath) {
    return undefined
  }

  return rawPath.startsWith("file://") ? fileURLToPath(rawPath) : rawPath
}
