import { feature } from "../gherkin"
import { validImplementations } from "./valid-implementations"

feature("./valid-scenarios.feature", {
  ...validImplementations,
  "fixture.step-mismatch": async ({ scenario }) => {
    await scenario.step("Given a different step name", async () => {})
  },
})
