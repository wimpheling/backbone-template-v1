import { createClient } from "@connectrpc/connect"
import { createConnectTransport } from "@connectrpc/connect-web"
import { Navigation } from "@backbone/design-system"
import { useMemo, useState } from "react"
import { Route, Routes } from "react-router"
import { GreeterService } from "./gen/helloworld/v1/helloworld_pb"
import {
  HelloPage,
  type HelloPageDynamicProps,
  type HelloPageStaticProps,
} from "./pages/hello/hello-page"

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

export function App() {
  return (
    <>
      <Navigation currentHref="/" items={[{ href: "/", label: "Hello" }]} />
      <Routes>
        <Route element={<HelloRoute />} path="/" />
      </Routes>
    </>
  )
}

function HelloRoute() {
  const greeter = useMemo(() => createClient(GreeterService, transport), [])
  const [name, setName] = useState("World")
  const [greeting, setGreeting] = useState("Hello, World!")
  const [isCalling, setIsCalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const staticProps: HelloPageStaticProps = {
    eyebrow: "Backbone",
    title: "ConnectRPC helloworld",
    greeting,
    name,
    nameLabel: "Name",
    namePlaceholder: "World",
    submitLabel: isCalling ? "Calling..." : "Say hello",
    isSubmitting: isCalling,
    error,
  }

  const dynamicProps: HelloPageDynamicProps = {
    onNameChanged: setName,
    onSubmitted: sayHello,
  }

  async function sayHello() {
    setIsCalling(true)
    setError(null)

    try {
      const response = await greeter.sayHello({ name })
      setGreeting(response.greeting)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed")
    } finally {
      setIsCalling(false)
    }
  }

  return <HelloPage {...staticProps} {...dynamicProps} />
}
