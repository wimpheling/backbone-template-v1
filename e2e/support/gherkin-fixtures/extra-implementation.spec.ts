import { feature } from "../gherkin"
import { validImplementations } from "./valid-implementations"

feature("./valid-scenarios.feature", {
  ...validImplementations,
  "fixture.unused-implementation": async () => {},
})
