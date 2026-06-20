import { noExternalUiImports, noRawDomJsx, noRawErrorMessage } from "./rules.js"

export default {
  meta: {
    name: "backbone-design-system",
  },
  rules: {
    "no-external-ui-imports": noExternalUiImports,
    "no-raw-dom-jsx": noRawDomJsx,
    "no-raw-error-message": noRawErrorMessage,
  },
}
