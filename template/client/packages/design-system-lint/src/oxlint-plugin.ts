import { noExternalUiImports, noRawDomJsx } from "./rules.js"

export default {
  meta: {
    name: "backbone-design-system",
  },
  rules: {
    "no-external-ui-imports": noExternalUiImports,
    "no-raw-dom-jsx": noRawDomJsx,
  },
}
