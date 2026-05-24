import type { StoryDefault } from "@ladle/react"
import { Loader } from "."

export default {
  title: "Design System / Loader",
} satisfies StoryDefault

export const Default = () => <Loader message="Loading hello-world inputs..." />
