import { feature } from "../gherkin"

feature("./duplicate-id.feature", {
  "fixture.duplicate-id": async ({ scenario }) => {
    await scenario.step("Given the first scenario uses the id", async () => {})
  },
})
