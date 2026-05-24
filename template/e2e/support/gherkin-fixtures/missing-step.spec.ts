import { feature } from "../gherkin"
import { validImplementations } from "./valid-implementations"

feature("./valid-scenarios.feature", {
  ...validImplementations,
  "fixture.missing-step": async () => {},
})
