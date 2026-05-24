import type { ScenarioImplementation } from "../gherkin"

export const validImplementations: Record<string, ScenarioImplementation> = {
  "fixture.happy-path": async ({ scenario }) => {
    await scenario.step("Given the first step matches", async () => {})
    await scenario.step("Then the second step matches", async () => {})
  },
  "fixture.step-mismatch": async ({ scenario }) => {
    await scenario.step("Given the documented step name", async () => {})
  },
  "fixture.missing-step": async ({ scenario }) => {
    await scenario.step("Given the documented step is not implemented", async () => {})
  },
  "fixture.extra-step": async ({ scenario }) => {
    await scenario.step("Given the only documented step", async () => {})
  },
  "fixture.missing-implementation": async ({ scenario }) => {
    await scenario.step("Given the scenario is not implemented", async () => {})
  },
  "fixture.extra-implementation": async ({ scenario }) => {
    await scenario.step("Given the feature has one implementation", async () => {})
  },
}
