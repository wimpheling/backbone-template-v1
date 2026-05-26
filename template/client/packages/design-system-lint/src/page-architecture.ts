import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

export type PageArchitecturePaths = {
  appSrcFile?: string
  pagesSrcDir: string
}

export type PageArchitectureResult = {
  errors: string[]
}

type PageFile = {
  absolutePath: string
  pageName: string
  relativePath: string
}

type PageNames = {
  component: string
  dynamicPropKeys: string
  dynamicProps: string
  staticProps: string
}

export function checkPageArchitecture(paths: PageArchitecturePaths): PageArchitectureResult {
  const errors: string[] = []

  if (paths.appSrcFile !== undefined) {
    errors.push(...checkAppFile(paths.appSrcFile))
  }

  for (const pageFile of findPageFiles(paths.pagesSrcDir)) {
    errors.push(...checkPageFile(pageFile))
    errors.push(...checkPageCompanionFiles(pageFile))
  }

  return { errors }
}

function checkAppFile(appSrcFile: string) {
  if (!fs.existsSync(appSrcFile)) {
    return []
  }

  const sourceText = fs.readFileSync(appSrcFile, "utf8")
  const sourceFile = ts.createSourceFile(
    appSrcFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const errors: string[] = []

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue
    }

    const moduleName = statement.moduleSpecifier.text

    if (moduleName === "@backbone/design-system") {
      errors.push(
        'App file "App.tsx" must not import @backbone/design-system; render design-system components from page templates or app shell components.',
      )
    }

    if (
      moduleName === "@connectrpc/connect" ||
      moduleName === "@connectrpc/connect-web" ||
      moduleName === "zustand" ||
      moduleName.startsWith("./gen/")
    ) {
      errors.push(
        `App file "App.tsx" must not import "${moduleName}"; page state belongs in sibling page state files.`,
      )
    }

    if (moduleName.startsWith("./pages/") && moduleName.endsWith("-page")) {
      errors.push(`App file "App.tsx" must import a page route adapter instead of "${moduleName}".`)
    }

    if (
      moduleName === "react" &&
      statement.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      for (const element of statement.importClause.namedBindings.elements) {
        const importName = element.propertyName?.text ?? element.name.text

        if (["useEffect", "useMemo", "useReducer", "useState"].includes(importName)) {
          errors.push(
            `App file "App.tsx" must not import React hook "${importName}"; route/page state belongs in page route and state files.`,
          )
        }
      }
    }
  }

  return errors
}

function findPageFiles(pagesSrcDir: string): PageFile[] {
  if (!fs.existsSync(pagesSrcDir)) {
    return []
  }

  return findFiles(pagesSrcDir)
    .filter((filePath) => filePath.endsWith("-page.tsx"))
    .map((absolutePath) => {
      const relativePath = normalizePath(path.relative(pagesSrcDir, absolutePath))
      const pageName = path.basename(absolutePath, "-page.tsx")

      return { absolutePath, pageName, relativePath }
    })
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
}

function checkPageFile(pageFile: PageFile) {
  const sourceText = fs.readFileSync(pageFile.absolutePath, "utf8")
  const sourceFile = ts.createSourceFile(
    pageFile.absolutePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const expectedNames = getExpectedNames(pageFile.pageName)
  const exportedTypeAliases = getExportedTypeAliases(sourceFile)
  const exportedVariables = getExportedVariables(sourceFile)
  const errors: string[] = []

  errors.push(...checkImports(sourceFile, pageFile))
  errors.push(...checkRequiredTypeExport(exportedTypeAliases, pageFile, expectedNames.staticProps))
  errors.push(...checkRequiredTypeExport(exportedTypeAliases, pageFile, expectedNames.dynamicProps))
  errors.push(
    ...checkRequiredConstExport(exportedVariables, pageFile, expectedNames.dynamicPropKeys),
  )
  errors.push(...checkPageComponent(exportedVariables, pageFile, expectedNames))
  errors.push(...checkDynamicProps(exportedTypeAliases, exportedVariables, pageFile, expectedNames))

  return errors
}

function checkPageCompanionFiles(pageFile: PageFile) {
  const errors: string[] = []
  const pageDir = path.dirname(pageFile.absolutePath)
  const routePath = path.join(pageDir, `${pageFile.pageName}-page-route.tsx`)
  const statePath = path.join(pageDir, `${pageFile.pageName}-page-state.ts`)

  if (!fs.existsSync(routePath)) {
    errors.push(
      `Page "${pageFile.relativePath}" must have a sibling route adapter "${pageFile.pageName}-page-route.tsx".`,
    )
  } else {
    errors.push(...checkPageRouteFile(routePath, pageFile))
  }

  if (!fs.existsSync(statePath)) {
    errors.push(
      `Page "${pageFile.relativePath}" must have a sibling Zustand state file "${pageFile.pageName}-page-state.ts".`,
    )
  } else {
    errors.push(...checkPageStateFile(statePath, pageFile))
  }

  return errors
}

function checkPageRouteFile(routePath: string, pageFile: PageFile) {
  const sourceFile = createTsxSourceFile(routePath)
  const relativePath = getSiblingRelativePath(routePath, pageFile)
  const imports = getImports(sourceFile)
  const errors: string[] = []

  if (imports.includes("@backbone/design-system")) {
    errors.push(
      `Page route adapter "${relativePath}" must not import @backbone/design-system; keep UI composition in "${path.basename(pageFile.absolutePath)}".`,
    )
  }

  errors.push(
    ...checkRequiredImport(
      imports,
      `./${pageFile.pageName}-page`,
      `Page route adapter "${relativePath}" must import "./${pageFile.pageName}-page".`,
    ),
  )
  errors.push(
    ...checkRequiredImport(
      imports,
      `./${pageFile.pageName}-page-state`,
      `Page route adapter "${relativePath}" must import "./${pageFile.pageName}-page-state".`,
    ),
  )

  return errors
}

function checkPageStateFile(statePath: string, pageFile: PageFile) {
  const sourceFile = createTsSourceFile(statePath)
  const relativePath = getSiblingRelativePath(statePath, pageFile)
  const imports = getImports(sourceFile)
  const errors: string[] = []

  if (imports.includes("@backbone/design-system")) {
    errors.push(
      `Page state file "${relativePath}" must not import @backbone/design-system; keep UI composition in "${path.basename(pageFile.absolutePath)}".`,
    )
  }

  if (imports.includes(`./${pageFile.pageName}-page`)) {
    errors.push(
      `Page state file "${relativePath}" must not import "./${pageFile.pageName}-page"; page state must stay independent from UI components.`,
    )
  }

  errors.push(
    ...checkRequiredImport(
      imports,
      "zustand",
      `Page state file "${relativePath}" must import "zustand".`,
    ),
  )

  return errors
}

function checkImports(sourceFile: ts.SourceFile, pageFile: PageFile) {
  const errors: string[] = []

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue
    }

    const moduleName = statement.moduleSpecifier.text

    if (moduleName === "@backbone/design-system" || moduleName === "../page") {
      continue
    }

    errors.push(
      `Page file "${pageFile.relativePath}" must not import "${moduleName}"; page templates may only import @backbone/design-system and ../page.`,
    )
  }

  return errors
}

function checkRequiredImport(imports: string[], requiredImport: string, error: string) {
  if (imports.includes(requiredImport)) {
    return []
  }

  return [error]
}

function checkRequiredTypeExport(
  exportedTypeAliases: Map<string, ts.TypeAliasDeclaration>,
  pageFile: PageFile,
  exportName: string,
) {
  if (exportedTypeAliases.has(exportName)) {
    return []
  }

  return [`Page file "${pageFile.relativePath}" must export type "${exportName}".`]
}

function checkRequiredConstExport(
  exportedVariables: Map<string, ts.VariableDeclaration>,
  pageFile: PageFile,
  exportName: string,
) {
  if (exportedVariables.has(exportName)) {
    return []
  }

  return [`Page file "${pageFile.relativePath}" must export const "${exportName}".`]
}

function checkPageComponent(
  exportedVariables: Map<string, ts.VariableDeclaration>,
  pageFile: PageFile,
  expectedNames: PageNames,
) {
  const pageComponent = exportedVariables.get(expectedNames.component)

  if (pageComponent === undefined || !isExpectedPageType(pageComponent.type, expectedNames)) {
    return [
      `Page component "${expectedNames.component}" in "${pageFile.relativePath}" must be typed as "Page<${expectedNames.staticProps}, ${expectedNames.dynamicProps}>".`,
    ]
  }

  return []
}

function checkDynamicProps(
  exportedTypeAliases: Map<string, ts.TypeAliasDeclaration>,
  exportedVariables: Map<string, ts.VariableDeclaration>,
  pageFile: PageFile,
  expectedNames: PageNames,
) {
  const dynamicProps = exportedTypeAliases.get(expectedNames.dynamicProps)

  if (dynamicProps === undefined || !ts.isTypeLiteralNode(dynamicProps.type)) {
    return []
  }

  const dynamicPropNames: string[] = []
  const errors: string[] = []

  for (const member of dynamicProps.type.members) {
    const propName = getPropertyName(member.name)

    if (propName === undefined) {
      continue
    }

    dynamicPropNames.push(propName)

    if (!isFunctionMember(member)) {
      errors.push(
        `Dynamic prop "${propName}" in "${pageFile.relativePath}" must be a function callback.`,
      )
    }

    if (!/^on[A-Z]/.test(propName)) {
      errors.push(
        `Dynamic prop "${propName}" in "${pageFile.relativePath}" must start with "on" followed by an uppercase letter.`,
      )
    }
  }

  errors.push(
    ...checkDynamicPropKeys(
      exportedVariables.get(expectedNames.dynamicPropKeys),
      dynamicPropNames,
      pageFile,
    ),
  )

  return errors
}

function checkDynamicPropKeys(
  dynamicPropKeysDeclaration: ts.VariableDeclaration | undefined,
  dynamicPropNames: string[],
  pageFile: PageFile,
) {
  if (dynamicPropKeysDeclaration === undefined) {
    return []
  }

  const dynamicPropKeys = getStringArrayInitializer(dynamicPropKeysDeclaration.initializer)

  if (dynamicPropKeys === undefined) {
    return []
  }

  const expectedKeys = new Set(dynamicPropNames)
  const actualKeys = new Set(dynamicPropKeys)
  const errors: string[] = []

  for (const expectedKey of expectedKeys) {
    if (!actualKeys.has(expectedKey)) {
      errors.push(`Dynamic prop keys in "${pageFile.relativePath}" must include "${expectedKey}".`)
    }
  }

  for (const actualKey of actualKeys) {
    if (!expectedKeys.has(actualKey)) {
      errors.push(
        `Dynamic prop keys in "${pageFile.relativePath}" must not include unknown key "${actualKey}".`,
      )
    }
  }

  return errors
}

function getExportedTypeAliases(sourceFile: ts.SourceFile) {
  const typeAliases = new Map<string, ts.TypeAliasDeclaration>()

  for (const statement of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(statement) && hasExportModifier(statement)) {
      typeAliases.set(statement.name.text, statement)
    }
  }

  return typeAliases
}

function getExportedVariables(sourceFile: ts.SourceFile) {
  const variables = new Map<string, ts.VariableDeclaration>()

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement) || !hasExportModifier(statement)) {
      continue
    }

    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        variables.set(declaration.name.text, declaration)
      }
    }
  }

  return variables
}

function isExpectedPageType(typeNode: ts.TypeNode | undefined, expectedNames: PageNames) {
  if (typeNode === undefined || !ts.isTypeReferenceNode(typeNode)) {
    return false
  }

  return (
    getTypeName(typeNode.typeName) === "Page" &&
    typeNode.typeArguments?.length === 2 &&
    typeNode.typeArguments[0]?.getText() === expectedNames.staticProps &&
    typeNode.typeArguments[1]?.getText() === expectedNames.dynamicProps
  )
}

function isFunctionMember(member: ts.TypeElement) {
  return (
    ts.isMethodSignature(member) ||
    (ts.isPropertySignature(member) &&
      member.type !== undefined &&
      ts.isFunctionTypeNode(member.type))
  )
}

function getPropertyName(name: ts.PropertyName | undefined) {
  if (name === undefined) {
    return undefined
  }

  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
    return name.text
  }

  return undefined
}

function getStringArrayInitializer(initializer: ts.Expression | undefined): string[] | undefined {
  const unwrapped = unwrapExpression(initializer)

  if (unwrapped === undefined || !ts.isArrayLiteralExpression(unwrapped)) {
    return undefined
  }

  const values: string[] = []

  for (const element of unwrapped.elements) {
    const unwrappedElement = unwrapExpression(element)

    if (unwrappedElement === undefined || !ts.isStringLiteral(unwrappedElement)) {
      return undefined
    }

    values.push(unwrappedElement.text)
  }

  return values
}

function unwrapExpression(expression: ts.Expression | undefined): ts.Expression | undefined {
  if (expression === undefined) {
    return undefined
  }

  if (ts.isAsExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return unwrapExpression(expression.expression)
  }

  return expression
}

function createTsSourceFile(filePath: string) {
  const sourceText = fs.readFileSync(filePath, "utf8")

  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
}

function createTsxSourceFile(filePath: string) {
  const sourceText = fs.readFileSync(filePath, "utf8")

  return ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

function getImports(sourceFile: ts.SourceFile) {
  const imports: string[] = []

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      imports.push(statement.moduleSpecifier.text)
    }
  }

  return imports
}

function getSiblingRelativePath(filePath: string, pageFile: PageFile) {
  const pagesSrcDir = path.resolve(
    pageFile.absolutePath,
    ...pageFile.relativePath.split("/").map(() => ".."),
  )

  return normalizePath(path.relative(pagesSrcDir, filePath))
}

function getExpectedNames(pageName: string): PageNames {
  const component = `${toPascalCase(pageName)}Page`

  return {
    component,
    dynamicPropKeys: `${toCamelCase(pageName)}PageDynamicPropKeys`,
    dynamicProps: `${component}DynamicProps`,
    staticProps: `${component}StaticProps`,
  }
}

function getTypeName(typeName: ts.EntityName) {
  if (ts.isIdentifier(typeName)) {
    return typeName.text
  }

  return typeName.getText()
}

function hasExportModifier(statement: ts.Node) {
  return (
    ts.canHaveModifiers(statement) &&
    ts
      .getModifiers(statement)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
  )
}

function findFiles(rootDir: string): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...findFiles(absolutePath))
    } else if (entry.isFile()) {
      files.push(absolutePath)
    }
  }

  return files
}

function toPascalCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

function toCamelCase(value: string) {
  const pascalCase = toPascalCase(value)

  return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1)
}

function normalizePath(filePath: string) {
  return filePath.split(path.sep).join("/")
}
