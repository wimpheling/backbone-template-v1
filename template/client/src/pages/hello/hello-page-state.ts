import { create } from "zustand"
import { greeterClient, toErrorMessage } from "../../app/rpc"

type HelloPageState = {
  error: string | null
  greeting: string
  isCalling: boolean
  name: string
  sayHello(): Promise<void>
  setName(name: string): void
}

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
      const response = await greeterClient.sayHello({ name: get().name })
      set({ greeting: response.greeting })
    } catch (caught) {
      set({ error: toErrorMessage(caught, "Request failed") })
    } finally {
      set({ isCalling: false })
    }
  },
}))
