import { feature } from "../gherkin"

feature("./missing-id.feature", {
  "fixture.missing-id": async ({ scenario }) => {
    await scenario.step("Given the scenario has no id tag", async () => {})
  },
})
