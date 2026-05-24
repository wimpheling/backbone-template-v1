import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

export type DesignSystemArchitecturePaths = {
  contractSrcDir: string
  implementationSrcDir: string
}

export type DesignSystemArchitectureResult = {
  errors: string[]
}

type ComponentFile = {
  absolutePath: string
  componentPath: string
  relativePath: string
}

export function checkDesignSystemArchitecture(
  paths: DesignSystemArchitecturePaths,
): DesignSystemArchitectureResult {
  const contractFiles = findComponentFiles(paths.contractSrcDir, ".ts")
  const implementationFiles = findComponentFiles(paths.implementationSrcDir, ".tsx")
  const errors = [
    ...checkMatchingComponentFiles(contractFiles, implementationFiles),
    ...checkBarrelExports(paths.contractSrcDir, "index.ts", contractFiles, "Contract"),
    ...checkBarrelExports(
      paths.implementationSrcDir,
      "index.tsx",
      implementationFiles,
      "Implementation",
    ),
    ...checkContractFiles(contractFiles),
    ...checkImplementationFiles(implementationFiles, paths.implementationSrcDir),
  ]

  return { errors }
}

function findComponentFiles(srcDir: string, extension: ".ts" | ".tsx") {
  if (!fs.existsSync(srcDir)) {
    return []
  }

  return findFiles(srcDir)
    .filter((filePath) => isComponentFile(filePath, extension))
    .map((absolutePath) => {
      const relativePath = normalizePath(path.relative(srcDir, absolutePath))
      const componentPath = relativePath.slice(0, -extension.length)

      return { absolutePath, componentPath, relativePath }
    })
    .sort((left, right) => left.componentPath.localeCompare(right.componentPath))
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

function isComponentFile(filePath: string, extension: ".ts" | ".tsx") {
  const fileName = path.basename(filePath)

  return (
    fileName !== `index${extension}` &&
    !fileName.endsWith(".stories.tsx") &&
    fileName.endsWith(extension)
  )
}

function checkMatchingComponentFiles(
  contractFiles: ComponentFile[],
  implementationFiles: ComponentFile[],
) {
  const errors: string[] = []
  const contractComponentPaths = new Set(contractFiles.map((file) => file.componentPath))
  const implementationComponentPaths = new Set(
    implementationFiles.map((file) => file.componentPath),
  )

  for (const componentPath of implementationComponentPaths) {
    if (!contractComponentPaths.has(componentPath)) {
      errors.push(
        `Component "${componentPath}" exists in implementation but is missing from contract.`,
      )
    }
  }

  for (const componentPath of contractComponentPaths) {
    if (!implementationComponentPaths.has(componentPath)) {
      errors.push(
        `Component "${componentPath}" exists in contract but is missing from implementation.`,
      )
    }
  }

  return errors
}

function checkContractFiles(files: ComponentFile[]) {
  return files.flatMap(checkContractExports)
}

function checkImplementationFiles(files: ComponentFile[], implementationSrcDir: string) {
  return files.flatMap((file) => [
    ...checkImplementationExport(file),
    ...checkColocatedStory(file, implementationSrcDir),
  ])
}

function checkBarrelExports(
  srcDir: string,
  barrelFileName: "index.ts" | "index.tsx",
  componentFiles: ComponentFile[],
  packageName: "Contract" | "Implementation",
) {
  const barrelRelativePath = barrelFileName
  const barrelAbsolutePath = path.join(srcDir, barrelFileName)
  const expectedExports = componentFiles.map((file) => `./${file.componentPath}`).sort()
  const actualExports = getBarrelExports(barrelAbsolutePath)
  const errors: string[] = []

  for (const exportPath of expectedExports) {
    if (!actualExports.has(exportPath)) {
      errors.push(`${packageName} barrel "${barrelRelativePath}" must export "${exportPath}".`)
    }
  }

  for (const exportPath of actualExports) {
    if (!expectedExports.includes(exportPath)) {
      errors.push(`${packageName} barrel "${barrelRelativePath}" must not export "${exportPath}".`)
    }
  }

  return errors
}

function checkContractExports(file: ComponentFile) {
  const actualExports = getNamedExports(file.absolutePath)
  const componentName = toPascalCase(path.basename(file.componentPath))
  const expectedExports = [`${componentName}Component`, `${componentName}Props`].sort()

  if (
    actualExports.length === 2 &&
    [...actualExports].sort().join("\n") === expectedExports.join("\n")
  ) {
    return []
  }

  return [
    `Contract component file "${file.relativePath}" must export exactly "${expectedExports[0]}" and "${expectedExports[1]}".`,
  ]
}

function checkImplementationExport(file: ComponentFile) {
  const actualExports = getNamedExports(file.absolutePath)
  const expectedExport = toPascalCase(path.basename(file.componentPath))

  if (actualExports.length === 1 && actualExports[0] === expectedExport) {
    return []
  }

  return [
    `Implementation component file "${file.relativePath}" must export exactly "${expectedExport}".`,
  ]
}

function checkColocatedStory(file: ComponentFile, implementationSrcDir: string) {
  const expectedStoryPath = `${file.componentPath}.stories.tsx`
  const absoluteStoryPath = path.join(implementationSrcDir, expectedStoryPath)

  if (fs.existsSync(absoluteStoryPath)) {
    return []
  }

  return [
    `Implementation component "${file.componentPath}" must have a colocated story file at "${expectedStoryPath}".`,
  ]
}

function getBarrelExports(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return new Set<string>()
  }

  const sourceText = fs.readFileSync(filePath, "utf8")
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
  const exports = new Set<string>()

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier === undefined) {
      continue
    }

    if (ts.isStringLiteral(statement.moduleSpecifier)) {
      exports.add(statement.moduleSpecifier.text)
    }
  }

  return exports
}

function getNamedExports(filePath: string) {
  const sourceText = fs.readFileSync(filePath, "utf8")
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)
  const exports: string[] = []

  for (const statement of sourceFile.statements) {
    const exportedDeclarationName = getExportedDeclarationName(statement)

    if (exportedDeclarationName !== undefined) {
      exports.push(exportedDeclarationName)
    } else if (ts.isExportDeclaration(statement) && statement.exportClause !== undefined) {
      if (ts.isNamedExports(statement.exportClause)) {
        exports.push(...statement.exportClause.elements.map((element) => element.name.text))
      } else {
        exports.push("*")
      }
    }
  }

  return exports.sort()
}

function getExportedDeclarationName(statement: ts.Statement) {
  if (!hasExportModifier(statement)) {
    return undefined
  }

  if (ts.isVariableStatement(statement)) {
    const firstDeclaration = statement.declarationList.declarations[0]

    if (
      firstDeclaration !== undefined &&
      statement.declarationList.declarations.length === 1 &&
      ts.isIdentifier(firstDeclaration.name)
    ) {
      return firstDeclaration.name.text
    }
  }

  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)) &&
    statement.name !== undefined
  ) {
    return statement.name.text
  }

  return "*"
}

function hasExportModifier(statement: ts.Statement) {
  return (
    ts.canHaveModifiers(statement) &&
    ts
      .getModifiers(statement)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true
  )
}

function toPascalCase(fileName: string) {
  return fileName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

function normalizePath(filePath: string) {
  return filePath.split(path.sep).join("/")
}
