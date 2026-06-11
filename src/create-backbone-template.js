import { constants as fsConstants } from "node:fs"
import {
  access,
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, "..")
const templateRoot = path.join(packageRoot, "template")
const helpFlags = new Set(["-h", "--help"])

export async function runCli({
  args = process.argv.slice(2),
  cwd = process.cwd(),
  stdout = console.log,
  stderr = console.error,
} = {}) {
  if (args.some((arg) => helpFlags.has(arg))) {
    stdout(usageText())
    return 0
  }

  const targetArg = args.find((arg) => !arg.startsWith("-"))

  if (!targetArg) {
    stdout(usageText())
    return 1
  }

  try {
    const result = await createBackboneProject({ cwd, targetArg })
    const relativeTarget = path.relative(cwd, result.targetDir) || "."

    stdout(`Created ${result.projectName} in ${relativeTarget}`)
    stdout("")
    stdout("Next steps:")
    stdout(`  cd ${shellPath(relativeTarget)}`)
    stdout("  just setup")
    stdout("  just full-validation")
    stdout("  just dev")
    stdout("")
    stdout("See README.md in the generated project for the project guide.")

    return 0
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error))
    return 1
  }
}

export async function createBackboneProject({ cwd, targetArg }) {
  const targetDir = path.resolve(cwd, targetArg)
  const projectName = packageNameFromTarget(targetDir)

  await assertTemplateExists()
  await assertTargetIsWritable(targetDir)
  await copyTemplate(targetDir)
  await restoreTemplateDotfiles(targetDir)
  await personalizeProject(targetDir, projectName)

  return { projectName, targetDir }
}

export function usageText() {
  return [
    "Usage:",
    "  npm create backbone-template@latest <project-directory>",
    "",
    "Examples:",
    "  npm create backbone-template@latest my-app",
    "  npx create-backbone-template my-app",
  ].join("\n")
}

async function assertTemplateExists() {
  try {
    await access(templateRoot, fsConstants.R_OK)
  } catch {
    throw new Error(`Template directory not found: ${templateRoot}`)
  }
}

async function assertTargetIsWritable(targetDir) {
  const parentDir = path.dirname(targetDir)

  await mkdir(parentDir, { recursive: true })

  try {
    const entries = await readdir(targetDir)

    if (entries.length > 0) {
      throw new Error(`Target directory is not empty: ${targetDir}`)
    }
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return
    }

    throw error
  }
}

async function copyTemplate(targetDir) {
  await cp(templateRoot, targetDir, {
    recursive: true,
    force: false,
    errorOnExist: true,
    filter: (source) => !isIgnoredTemplatePath(path.relative(templateRoot, source)),
  })
}

async function restoreTemplateDotfiles(targetDir) {
  const entries = await readdir(targetDir, { withFileTypes: true })

  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(targetDir, entry.name)

      if (entry.isDirectory()) {
        await restoreTemplateDotfiles(entryPath)
        return
      }

      if (entry.name !== "_gitignore") {
        return
      }

      const gitignorePath = path.join(targetDir, ".gitignore")

      await rm(gitignorePath, { force: true })
      await rename(entryPath, gitignorePath)
    }),
  )
}

function isIgnoredTemplatePath(relativePath) {
  if (!relativePath) {
    return false
  }

  const segments = relativePath.split(path.sep)
  const basename = segments.at(-1)

  return (
    basename === ".git" ||
    basename === "node_modules" ||
    basename === "target" ||
    basename === "dist" ||
    basename === "playwright-report" ||
    basename === "test-results" ||
    basename === "backbone.sqlite" ||
    basename.endsWith(".local")
  )
}

async function personalizeProject(targetDir, projectName) {
  const projectNames = projectNamesFromPackageName(projectName)

  await renameProjectPaths(targetDir, projectNames)
  await replaceProjectTokens(targetDir, projectNames)

  const packageJsonPath = path.join(targetDir, "package.json")
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))

  packageJson.name = projectName

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
}

async function renameProjectPaths(targetDir, projectNames) {
  const lintDir = path.join(targetDir, "server/dylint/backbone_server_lints")
  const renamedLintDir = path.join(targetDir, `server/dylint/${projectNames.snake}_server_lints`)

  try {
    await rename(lintDir, renamedLintDir)
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return
    }

    throw error
  }
}

async function replaceProjectTokens(targetDir, projectNames) {
  const replacements = [
    ["BACKBONE_SKIP_GENERATE", `${projectNames.constant}_SKIP_GENERATE`],
    ["BackboneServerLints", `${projectNames.pascal}ServerLints`],
    ["backbone_server_lints", `${projectNames.snake}_server_lints`],
    ["@backbone/design-system-contract", `${projectNames.scope}/design-system-contract`],
    ["@backbone/design-system-basic", `${projectNames.scope}/design-system-basic`],
    ["@backbone/design-system-lint", `${projectNames.scope}/design-system-lint`],
    ["@backbone/design-system", `${projectNames.scope}/design-system`],
    ["backbone-design-system", `${projectNames.packageName}-design-system`],
    ["backbone-gherkin-adapter", `${projectNames.packageName}-gherkin-adapter`],
    ["backbone-page-architecture", `${projectNames.packageName}-page-architecture`],
    ["backbone-client", `${projectNames.packageName}-client`],
    ["backbone-e2e", `${projectNames.packageName}-e2e`],
    ["backbone-test.sqlite", `${projectNames.packageName}-test.sqlite`],
    ["backbone.sqlite", `${projectNames.packageName}.sqlite`],
  ]
  const titleReplacements = [
    ["Backbone", projectNames.title],
    ["backbone", projectNames.packageName],
  ]

  for (const filePath of await listTemplateFiles(targetDir)) {
    const source = await readFile(filePath, "utf8")
    let updated = source

    for (const [oldValue, newValue] of replacements) {
      updated = updated.replaceAll(oldValue, newValue)
    }

    if (isHumanFacingTemplateFile(targetDir, filePath)) {
      for (const [oldValue, newValue] of titleReplacements) {
        updated = updated.replaceAll(oldValue, newValue)
      }
    }

    if (updated !== source) {
      await writeFile(filePath, updated)
    }
  }
}

async function listTemplateFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await listTemplateFiles(entryPath)))
      continue
    }

    if (entry.isFile() && isTextTemplateFile(entry.name)) {
      files.push(entryPath)
    }
  }

  return files
}

function isTextTemplateFile(filename) {
  return (
    !filename.endsWith(".sqlite") &&
    !filename.endsWith(".png") &&
    !filename.endsWith(".jpg") &&
    !filename.endsWith(".jpeg") &&
    !filename.endsWith(".webp")
  )
}

function isHumanFacingTemplateFile(targetDir, filePath) {
  const relativePath = normalizePath(path.relative(targetDir, filePath))

  return (
    relativePath === "AGENTS.md" ||
    relativePath === "README.md" ||
    relativePath === "client/README.md" ||
    relativePath === "client/index.html" ||
    relativePath.startsWith(".agents/") ||
    /^server\/dylint\/[^/]+_server_lints\/README\.md$/.test(relativePath) ||
    relativePath.endsWith(".stories.tsx") ||
    relativePath.endsWith("/hello-page-route.tsx") ||
    relativePath.endsWith("/hello-page.test.tsx")
  )
}

function normalizePath(value) {
  return value.split(path.sep).join("/")
}

function packageNameFromTarget(targetDir) {
  const rawName = path.basename(targetDir)
  const normalized = rawName
    .trim()
    .toLowerCase()
    .replace(/^[._]+/, "")
    .replace(/[\\/_\s]+/g, "-")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "backbone-app"
}

function projectNamesFromPackageName(packageName) {
  const parts = packageName.split(/[^a-z0-9]+/).filter(Boolean)
  const title = parts.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ")
  const pascal = parts.map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join("")
  const snake = packageName.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  const constant = snake.toUpperCase()

  return {
    constant,
    packageName,
    pascal,
    scope: `@${packageName}`,
    snake,
    title,
  }
}

function shellPath(value) {
  if (/^[a-zA-Z0-9_./-]+$/.test(value)) {
    return value
  }

  return JSON.stringify(value)
}
