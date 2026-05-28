import { createPreviewDynamicProps } from "../../testing/create-preview-events"
import {
  HelloPage,
  type HelloPageDynamicProps,
  type HelloPageStaticProps,
  helloPageDynamicPropKeys,
} from "./hello-page"

const helloPagePreviewStates = {
  ready: {
    eyebrow: "Backbone",
    title: "ConnectRPC helloworld",
    greeting: "Hello, World!",
    name: "World",
    nameLabel: "Name",
    namePlaceholder: "World",
    navigationCurrentHref: "/",
    navigationItems: [{ href: "/", label: "Hello" }],
    submitLabel: "Say hello",
    isSubmitting: false,
    error: null,
  },
  calling: {
    eyebrow: "Backbone",
    title: "ConnectRPC helloworld",
    greeting: "Hello, World!",
    name: "World",
    nameLabel: "Name",
    namePlaceholder: "World",
    navigationCurrentHref: "/",
    navigationItems: [{ href: "/", label: "Hello" }],
    submitLabel: "Calling...",
    isSubmitting: true,
    error: null,
  },
  error: {
    eyebrow: "Backbone",
    title: "ConnectRPC helloworld",
    greeting: "Hello, World!",
    name: "World",
    nameLabel: "Name",
    namePlaceholder: "World",
    navigationCurrentHref: "/",
    navigationItems: [{ href: "/", label: "Hello" }],
    submitLabel: "Say hello",
    isSubmitting: false,
    error: "Request failed",
  },
} satisfies Record<string, HelloPageStaticProps>

const { dynamicProps } = createPreviewDynamicProps<HelloPageDynamicProps>(
  helloPageDynamicPropKeys,
  {
    record: true,
  },
)

export const Ready = () => <HelloPage {...helloPagePreviewStates.ready} {...dynamicProps} />

export const Calling = () => <HelloPage {...helloPagePreviewStates.calling} {...dynamicProps} />

export const Error = () => <HelloPage {...helloPagePreviewStates.error} {...dynamicProps} />
