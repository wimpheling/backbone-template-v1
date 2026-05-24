import { feature } from "../gherkin"
import { validImplementations } from "./valid-implementations"

feature("./valid-scenarios.feature", {
  ...validImplementations,
  "fixture.extra-step": async ({ scenario }) => {
    await scenario.step("Given the only documented step", async () => {})
    await scenario.step("Then an extra implementation step runs", async () => {})
  },
})
