import { spawn, type ChildProcess } from "node:child_process"
import { mkdirSync, rmSync } from "node:fs"
import net from "node:net"
import os from "node:os"
import path from "node:path"

import { test as base } from "@playwright/test"
import Database from "better-sqlite3"

type AppWorker = {
  clientUrl: string
  db: E2eDatabase
  serverUrl: string
  stop(): Promise<void>
}

type WorkerFixtures = {
  app: AppWorker
}

export type AppFixtures = {
  db: E2eDatabase
  serverUrl: string
}

export const test = base.extend<AppFixtures, WorkerFixtures>({
  app: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright worker fixtures require object destructuring here.
    async ({}, use, workerInfo) => {
      const app = await startAppWorker(workerInfo.workerIndex)

      try {
        await use(app)
      } finally {
        await app.stop()
      }
    },
    { scope: "worker" },
  ],
  baseURL: async ({ app }, use) => {
    await use(app.clientUrl)
  },
  db: async ({ app }, use) => {
    await use(app.db)
  },
  serverUrl: async ({ app }, use) => {
    await use(app.serverUrl)
  },
})

export class E2eDatabase {
  readonly #database: Database.Database

  constructor(databasePath: string) {
    this.#database = new Database(databasePath)
  }

  close(): void {
    this.#database.close()
  }

  reset(): void {
    this.#database.prepare("DELETE FROM hello_world_inputs").run()
    this.#database.prepare("DELETE FROM projects").run()
  }

  listHelloWorldInputs(): string[] {
    return this.#database
      .prepare("SELECT input FROM hello_world_inputs ORDER BY created_at, id")
      .all()
      .map(readHelloWorldInput)
  }
}

async function startAppWorker(workerIndex: number): Promise<AppWorker> {
  const [serverPort, clientPort] = await Promise.all([freePort(), freePort()])
  const rootDir = path.resolve("..")
  const workerDir = path.join(os.tmpdir(), `backbone-e2e-${process.pid}-${workerIndex}`)
  const databasePath = path.join(workerDir, "backbone.sqlite")
  const databaseUrl = `sqlite://${databasePath}?mode=rwc`

  rmSync(workerDir, { force: true, recursive: true })
  mkdirSync(workerDir, { recursive: true })

  const serverUrl = `http://127.0.0.1:${serverPort}`
  const clientUrl = `http://127.0.0.1:${clientPort}`
  const env = {
    ...process.env,
    APP_ENV: "test",
    DATABASE_URL: databaseUrl,
    SERVER_HOST: "127.0.0.1",
    SERVER_PORT: String(serverPort),
    VITE_DEV_SERVER_PORT: String(clientPort),
    VITE_SERVER_URL: serverUrl,
  }
  const server = spawnProcess("cargo", ["run", "-p", "server"], rootDir, env)

  await waitForUrl(`${serverUrl}/health`, [server], "server")

  const client = spawnProcess(
    "pnpm",
    [
      "--filter",
      "backbone-client",
      "exec",
      "vite",
      "--host",
      "127.0.0.1",
      "--port",
      String(clientPort),
      "--strictPort",
    ],
    rootDir,
    env,
  )

  await waitForUrl(clientUrl, [server, client], "client")

  const db = new E2eDatabase(databasePath)

  return {
    clientUrl,
    db,
    serverUrl,
    async stop() {
      db.close()
      await stopProcess(client)
      await stopProcess(server)
      rmSync(workerDir, { force: true, recursive: true })
    },
  }
}

function spawnProcess(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): ChildProcess {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  })

  child.stdout?.on("data", (chunk: Buffer) => {
    process.stdout.write(chunk)
  })
  child.stderr?.on("data", (chunk: Buffer) => {
    process.stderr.write(chunk)
  })

  return child
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return
  }

  child.kill("SIGTERM")

  await new Promise<void>((resolve) => {
    child.once("exit", () => {
      resolve()
    })
    setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL")
      }
      resolve()
    }, 3000)
  })
}

async function waitForUrl(url: string, processes: ChildProcess[], name: string): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    for (const child of processes) {
      if (child.exitCode !== null) {
        throw new Error(`${name} dependency exited with code ${child.exitCode}`)
      }
    }

    try {
      // oxlint-disable-next-line no-await-in-loop -- Readiness polling is intentionally sequential.
      const response = await fetch(url)

      if (response.ok) {
        return
      }
    } catch {
      // Keep polling until the process is ready or exits.
    }

    // oxlint-disable-next-line no-await-in-loop -- Polling attempts need a delay between checks.
    await delay(200)
  }

  throw new Error(`Timed out waiting for ${name} at ${url}`)
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()

      if (typeof address === "object" && address !== null) {
        const port = address.port
        server.close(() => {
          resolve(port)
        })
      } else {
        server.close(() => {
          reject(new Error("Could not allocate a TCP port"))
        })
      }
    })
  })
}

function readHelloWorldInput(row: unknown): string {
  if (typeof row === "object" && row !== null && "input" in row && typeof row.input === "string") {
    return row.input
  }

  throw new Error("Unexpected hello_world_inputs row shape")
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
