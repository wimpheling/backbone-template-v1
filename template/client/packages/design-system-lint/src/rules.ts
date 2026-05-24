type RuleContext = {
  report(report: { message: string; node: unknown }): void
}

type ImportDeclarationNode = {
  source?: {
    value?: unknown
  }
}

type JsxNameNode = {
  name?: string
  type?: string
}

type JsxOpeningElementNode = {
  name?: JsxNameNode
}

type RuleModule<VisitorName extends string, Node> = {
  meta: {
    docs: {
      description: string
    }
    type: "problem"
  }
  create(context: RuleContext): Record<VisitorName, (node: Node) => void>
}

const forbiddenUiImports = {
  exact: new Set([
    "@emotion/react",
    "@emotion/styled",
    "antd",
    "lucide-react",
    "react-bootstrap",
    "reactstrap",
    "semantic-ui-react",
    "styled-components",
  ]),
  prefixes: ["@chakra-ui/", "@headlessui/", "@mantine/", "@mui/", "@radix-ui/", "@react-aria/"],
}

export const noExternalUiImports: RuleModule<"ImportDeclaration", ImportDeclarationNode> = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct imports from UI libraries outside the design system.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const moduleName = node.source?.value

        if (typeof moduleName !== "string" || !isForbiddenUiImport(moduleName)) {
          return
        }

        context.report({
          node: node.source,
          message: `Import "${moduleName}" bypasses the design system boundary.`,
        })
      },
    }
  },
}

export const noRawDomJsx: RuleModule<"JSXOpeningElement", JsxOpeningElementNode> = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow raw DOM JSX elements in app code.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const tagName = getJsxElementName(node.name)

        if (!isRawDomTag(tagName)) {
          return
        }

        context.report({
          node: node.name,
          message: `Raw JSX element <${tagName}> is not allowed in app code; use @backbone/design-system components.`,
        })
      },
    }
  },
}

function isForbiddenUiImport(moduleName: string) {
  return (
    forbiddenUiImports.exact.has(moduleName) ||
    forbiddenUiImports.prefixes.some((prefix) => moduleName.startsWith(prefix))
  )
}

function getJsxElementName(nameNode: JsxNameNode | undefined) {
  if (nameNode?.type === "JSXIdentifier") {
    return nameNode.name
  }

  return undefined
}

function isRawDomTag(tagName: string | undefined) {
  return typeof tagName === "string" && /^[a-z]/.test(tagName)
}
