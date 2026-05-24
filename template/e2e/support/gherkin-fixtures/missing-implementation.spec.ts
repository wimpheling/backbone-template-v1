import { feature } from "../gherkin"
import { validImplementations } from "./valid-implementations"

const { "fixture.missing-implementation": _missingImplementation, ...implementations } =
  validImplementations

feature("./valid-scenarios.feature", implementations)
