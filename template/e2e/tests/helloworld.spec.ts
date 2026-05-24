import assert from "node:assert/strict"

import { expect } from "@playwright/test"
import { feature } from "../support/app-gherkin"

feature("../features/helloworld.feature", {
  "hello.say-hello": async ({ db, page, scenario, serverUrl }) => {
    await scenario.step("Given the Rust server is healthy", async () => {
      await expect
        .poll(async () => {
          const response = await page.request.get(new URL("/health", serverUrl).toString())
          return response.ok()
        })
        .toBe(true)
    })

    await scenario.step("And the visitor is on the hello page", async () => {
      await page.goto("/")
    })

    await scenario.step("Then they see the default hello message", async () => {
      await expect(page.getByRole("heading", { name: "ConnectRPC helloworld" })).toBeVisible()
      await expect(page.getByText("Hello, World!")).toBeVisible()
    })

    await scenario.step("When they ask to greet Playwright", async () => {
      await page.getByLabel("Name").fill("Playwright")
      await page.getByRole("button", { name: "Say hello" }).click()
    })

    await scenario.step("Then they see the Playwright greeting", async () => {
      await expect(page.getByText("Hello, Playwright!")).toBeVisible()
    })

    await scenario.step("And the Playwright input is saved", async () => {
      assert.deepEqual(db.listHelloWorldInputs(), ["Playwright"])
    })
  },
})
