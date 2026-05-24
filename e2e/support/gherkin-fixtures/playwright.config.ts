import { defineConfig } from "@playwright/test"

export default defineConfig({
  reporter: "line",
  testDir: ".",
  workers: 1,
})
