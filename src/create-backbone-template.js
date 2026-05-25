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
  const packageJsonPath = path.join(targetDir, "package.json")
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))

  packageJson.name = projectName

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)

  const readmePath = path.join(targetDir, "README.md")
  const readme = await readFile(readmePath, "utf8")
  const title = projectTitleFromName(projectName)

  await writeFile(readmePath, readme.replace(/^# Backbone$/m, `# ${title}`))
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

function projectTitleFromName(projectName) {
  return projectName
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
}

function shellPath(value) {
  if (/^[a-zA-Z0-9_./-]+$/.test(value)) {
    return value
  }

  return JSON.stringify(value)
}
