import { test, type AppFixtures } from "./fixtures"
import { createFeature } from "./gherkin"

export const feature = createFeature<AppFixtures>(test)
