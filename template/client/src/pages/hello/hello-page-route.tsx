import { HelloPage, type HelloPageDynamicProps, type HelloPageStaticProps } from "./hello-page"
import { useHelloPageStore } from "./hello-page-state"

export function HelloPageRoute() {
  const error = useHelloPageStore((state) => state.error)
  const greeting = useHelloPageStore((state) => state.greeting)
  const isCalling = useHelloPageStore((state) => state.isCalling)
  const name = useHelloPageStore((state) => state.name)
  const sayHello = useHelloPageStore((state) => state.sayHello)
  const setName = useHelloPageStore((state) => state.setName)

  const staticProps: HelloPageStaticProps = {
    eyebrow: "Backbone",
    title: "ConnectRPC helloworld",
    greeting,
    name,
    nameLabel: "Name",
    namePlaceholder: "World",
    navigationCurrentHref: "/",
    navigationItems: [{ href: "/", label: "Hello" }],
    submitLabel: isCalling ? "Calling..." : "Say hello",
    isSubmitting: isCalling,
    error,
  }

  const dynamicProps: HelloPageDynamicProps = {
    onNameChanged: setName,
    onSubmitted: sayHello,
  }

  return <HelloPage {...staticProps} {...dynamicProps} />
}
