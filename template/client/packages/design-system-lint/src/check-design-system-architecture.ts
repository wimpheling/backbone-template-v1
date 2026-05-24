import path from "node:path"
import { checkDesignSystemArchitecture } from "./design-system-architecture.js"
import { checkPageArchitecture } from "./page-architecture.js"

const designSystemResult = checkDesignSystemArchitecture({
  contractSrcDir: path.resolve("../design-system-contract/src"),
  implementationSrcDir: path.resolve("../design-system-basic/src"),
})

const pageResult = checkPageArchitecture({
  pagesSrcDir: path.resolve("../../src/pages"),
})

const errors = [...designSystemResult.errors, ...pageResult.errors]

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error)
  }

  process.exitCode = 1
}
