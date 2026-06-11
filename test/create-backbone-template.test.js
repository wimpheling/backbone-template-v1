import { mkdtemp, mkdir, readFile, readdir } from "node:fs/promises"
import { execFile } from "node:child_process"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import assert from "node:assert/strict"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

import { runCli } from "../src/create-backbone-template.js"

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(__dirname, "..")
const binPath = path.join(packageRoot, "bin/create-backbone-template.js")
const backboneTokenPattern = /backbone|Backbone|@backbone|BACKBONE/

test("creates a backbone project from the template", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "backbone-create-"))
  const output = []
  const errors = []
  const status = await runCli({
    args: ["my-app"],
    cwd,
    stderr: (message) => errors.push(message),
    stdout: (message) => output.push(message),
  })

  assert.equal(status, 0, errors.join("\n"))
  assert.match(output.join("\n"), /Created my-app/)

  const targetDir = path.join(cwd, "my-app")
  const packageJson = JSON.parse(await readFile(path.join(targetDir, "package.json"), "utf8"))
  const clientPackageJson = JSON.parse(
    await readFile(path.join(targetDir, "client/package.json"), "utf8"),
  )
  const e2ePackageJson = JSON.parse(await readFile(path.join(targetDir, "e2e/package.json"), "utf8"))
  const designSystemPackageJson = JSON.parse(
    await readFile(
      path.join(targetDir, "client/packages/design-system/package.json"),
      "utf8",
    ),
  )
  const designSystemBasicPackageJson = JSON.parse(
    await readFile(
      path.join(targetDir, "client/packages/design-system-basic/package.json"),
      "utf8",
    ),
  )
  const designSystemContractPackageJson = JSON.parse(
    await readFile(
      path.join(targetDir, "client/packages/design-system-contract/package.json"),
      "utf8",
    ),
  )
  const designSystemLintPackageJson = JSON.parse(
    await readFile(
      path.join(targetDir, "client/packages/design-system-lint/package.json"),
      "utf8",
    ),
  )
  const readme = await readFile(path.join(targetDir, "README.md"), "utf8")
  const clientIndex = await readFile(path.join(targetDir, "client/index.html"), "utf8")
  const justfile = await readFile(path.join(targetDir, "Justfile"), "utf8")
  const workspaceCargoToml = await readFile(path.join(targetDir, "Cargo.toml"), "utf8")
  const serverLintLib = await readFile(
    path.join(targetDir, "server/dylint/my_app_server_lints/src/lib.rs"),
    "utf8",
  )
  const pnpmLock = await readFile(path.join(targetDir, "pnpm-lock.yaml"), "utf8")
  const rootEntries = await readdir(targetDir)
  const dylintEntries = await readdir(path.join(targetDir, "server/dylint"))

  assert.equal(packageJson.name, "my-app")
  assert.equal(clientPackageJson.name, "my-app-client")
  assert.equal(e2ePackageJson.name, "my-app-e2e")
  assert.equal(designSystemPackageJson.name, "@my-app/design-system")
  assert.equal(designSystemPackageJson.dependencies["@my-app/design-system-basic"], "workspace:*")
  assert.equal(
    designSystemPackageJson.dependencies["@my-app/design-system-contract"],
    "workspace:*",
  )
  assert.equal(designSystemBasicPackageJson.name, "@my-app/design-system-basic")
  assert.equal(
    designSystemBasicPackageJson.dependencies["@my-app/design-system-contract"],
    "workspace:*",
  )
  assert.equal(designSystemContractPackageJson.name, "@my-app/design-system-contract")
  assert.equal(designSystemLintPackageJson.name, "@my-app/design-system-lint")
  assert.match(
    readme,
    /^# My App\n\nReact \+ Rust ConnectRPC starter\.\n\n## Start Here\n\n```sh\njust setup\njust full-validation\njust dev\n```/m,
  )
  assert.match(clientIndex, /<title>My App Client<\/title>/)
  assert.match(justfile, /pnpm --filter my-app-client run dev/)
  assert.match(justfile, /pnpm --filter @my-app\/design-system-lint build/)
  assert.match(justfile, /MY_APP_SKIP_GENERATE=1 just e2e-browser/)
  assert.match(workspaceCargoToml, /server\/dylint\/my_app_server_lints/)
  assert.match(serverLintLib, /struct MyAppServerLints/)
  assert.doesNotMatch(serverLintLib, /BackboneServerLints/)
  assert.match(pnpmLock, /'@my-app\/design-system':/)
  assert.doesNotMatch(pnpmLock, /'@backbone\/design-system':/)
  assert.match(output.join("\n"), /See README\.md in the generated project/)
  assert.ok(rootEntries.includes("client"))
  assert.ok(rootEntries.includes("server"))
  assert.ok(rootEntries.includes("e2e"))
  assert.ok(rootEntries.includes("Justfile"))
  assert.ok(rootEntries.includes(".gitignore"))
  assert.ok(!rootEntries.includes("_gitignore"))
  assert.ok(dylintEntries.includes("my_app_server_lints"))
  assert.ok(!dylintEntries.includes("backbone_server_lints"))

  const remainingBackboneTokens = await findMatchingGeneratedText(targetDir, backboneTokenPattern)

  assert.deepEqual(remainingBackboneTokens, [])
})

test("does not double-rewrite generated names that contain backbone", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "backbone-create-"))
  const output = []
  const errors = []
  const status = await runCli({
    args: ["backbone-template-starter"],
    cwd,
    stderr: (message) => errors.push(message),
    stdout: (message) => output.push(message),
  })

  assert.equal(status, 0, errors.join("\n"))

  const targetDir = path.join(cwd, "backbone-template-starter")
  const clientIndex = await readFile(path.join(targetDir, "client/index.html"), "utf8")
  const serverLintLib = await readFile(
    path.join(targetDir, "server/dylint/backbone_template_starter_server_lints/src/lib.rs"),
    "utf8",
  )

  assert.match(output.join("\n"), /Created backbone-template-starter/)
  assert.match(clientIndex, /<title>Backbone Template Starter Client<\/title>/)
  assert.match(serverLintLib, /struct BackboneTemplateStarterServerLints/)
  assert.doesNotMatch(serverLintLib, /Backbone Template StarterTemplateStarterServerLints/)
})

test("refuses to create into a non-empty directory", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "backbone-create-"))
  const targetDir = path.join(cwd, "my-app")
  const output = []
  const errors = []

  await mkdir(targetDir)
  await mkdir(path.join(targetDir, "existing"))

  const status = await runCli({
    args: ["my-app"],
    cwd,
    stderr: (message) => errors.push(message),
    stdout: (message) => output.push(message),
  })

  assert.notEqual(status, 0)
  assert.equal(output.join("\n"), "")
  assert.match(errors.join("\n"), /Target directory is not empty/)
})

test("creates a project through the executable bin", async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "backbone-bin-"))

  const { stdout, stderr } = await execFileAsync(process.execPath, [binPath, "bin-app"], {
    cwd,
  })

  assert.equal(stderr, "")
  assert.match(stdout, /Created bin-app in bin-app/)

  const targetDir = path.join(cwd, "bin-app")
  const packageJson = JSON.parse(await readFile(path.join(targetDir, "package.json"), "utf8"))
  const rootEntries = await readdir(targetDir)

  assert.equal(packageJson.name, "bin-app")
  assert.ok(rootEntries.includes("README.md"))
  assert.ok(rootEntries.includes(".gitignore"))
})

async function findMatchingGeneratedText(rootDir, pattern) {
  const matches = []

  for (const filePath of await listGeneratedTextFiles(rootDir)) {
    const text = await readFile(filePath, "utf8")

    if (pattern.test(text)) {
      matches.push(path.relative(rootDir, filePath))
    }
  }

  return matches.sort()
}

async function listGeneratedTextFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await listGeneratedTextFiles(entryPath)))
      continue
    }

    if (entry.isFile() && isGeneratedTextFile(entry.name)) {
      files.push(entryPath)
    }
  }

  return files
}

function isGeneratedTextFile(filename) {
  return (
    !filename.endsWith(".sqlite") &&
    !filename.endsWith(".png") &&
    !filename.endsWith(".jpg") &&
    !filename.endsWith(".jpeg") &&
    !filename.endsWith(".webp")
  )
}
