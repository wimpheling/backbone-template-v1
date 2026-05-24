import { feature } from "../gherkin"

feature("./scenario-outline.feature", {
  "fixture.scenario-outline": async ({ scenario }) => {
    await scenario.step("Given the value is one", async () => {})
  },
})
