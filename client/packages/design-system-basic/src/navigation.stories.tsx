import type { StoryDefault } from "@ladle/react"
import { Navigation } from "."

export default {
  title: "Design System / Navigation",
} satisfies StoryDefault

export const Default = () => (
  <Navigation
    currentHref="/hello"
    items={[
      { href: "/hello", label: "Hello" },
      { href: "/history", label: "History" },
    ]}
  />
)
