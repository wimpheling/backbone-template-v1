import { createClient } from "@connectrpc/connect"
import { createConnectTransport } from "@connectrpc/connect-web"
import { create } from "zustand"
import { GreeterService } from "../../gen/helloworld/v1/helloworld_pb"

type HelloPageState = {
  error: string | null
  greeting: string
  isCalling: boolean
  name: string
  sayHello(): Promise<void>
  setName(name: string): void
}

function requireEnv(name: string): string {
  const value = import.meta.env[name]

  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const transport = createConnectTransport({
  baseUrl: requireEnv("VITE_SERVER_URL"),
})

const greeter = createClient(GreeterService, transport)

export const useHelloPageStore = create<HelloPageState>((set, get) => ({
  error: null,
  greeting: "Hello, World!",
  isCalling: false,
  name: "World",
  setName(name) {
    set({ name })
  },
  async sayHello() {
    set({ error: null, isCalling: true })

    try {
      const response = await greeter.sayHello({ name: get().name })
      set({ greeting: response.greeting })
    } catch (caught) {
      set({ error: caught instanceof Error ? caught.message : "Request failed" })
    } finally {
      set({ isCalling: false })
    }
  },
}))
