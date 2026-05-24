import { mkdtemp, mkdir, readFile, readdir } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import assert from "node:assert/strict"

import { runCli } from "../src/create-backbone-template.js"

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
  const readme = await readFile(path.join(targetDir, "README.md"), "utf8")
  const rootEntries = await readdir(targetDir)

  assert.equal(packageJson.name, "my-app")
  assert.match(readme, /^# My App/m)
  assert.ok(rootEntries.includes("client"))
  assert.ok(rootEntries.includes("server"))
  assert.ok(rootEntries.includes("e2e"))
  assert.ok(rootEntries.includes("Justfile"))
  assert.ok(rootEntries.includes(".gitignore"))
  assert.ok(!rootEntries.includes("_gitignore"))
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
