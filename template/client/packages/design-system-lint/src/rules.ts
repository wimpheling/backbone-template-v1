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

type MemberExpressionNode = {
  object?: {
    name?: string
    type?: string
  }
  property?: {
    name?: string
    type?: string
  }
}

type CatchClauseNode = {
  param?: {
    name?: string
    type?: string
  }
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

export const noRawErrorMessage: {
  meta: RuleModule<"MemberExpression", MemberExpressionNode>["meta"]
  create(context: RuleContext): {
    CatchClause(node: CatchClauseNode): void
    "CatchClause:exit"(): void
    MemberExpression(node: MemberExpressionNode): void
  }
} = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct Error.message access in app error rendering.",
    },
  },
  create(context) {
    const caughtErrorNames: Array<Set<string>> = []

    return {
      CatchClause(node) {
        const caughtName = node.param?.type === "Identifier" ? node.param.name : undefined

        caughtErrorNames.push(new Set(caughtName === undefined ? [] : [caughtName]))
      },
      "CatchClause:exit"() {
        caughtErrorNames.pop()
      },
      MemberExpression(node) {
        if (
          node.property?.type !== "Identifier" ||
          node.property.name !== "message" ||
          !isCaughtErrorMessageAccess(caughtErrorNames, node)
        ) {
          return
        }

        context.report({
          node: node.property,
          message: "Use the RPC error mapper instead of direct Error.message access.",
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

function isCaughtErrorMessageAccess(
  caughtErrorNames: Array<Set<string>>,
  node: MemberExpressionNode,
) {
  if (node.object?.type !== "Identifier" || node.object.name === undefined) {
    return false
  }

  return caughtErrorNames.some((names) => names.has(node.object?.name ?? ""))
}
