import type { StoryDefault } from "@ladle/react"
import { Button, EmptyState } from "."

export default {
  title: "Design System / EmptyState",
} satisfies StoryDefault

export const WithoutAction = () => (
  <EmptyState description="Say hello to create the first saved input." title="No inputs yet" />
)

export const WithAction = () => (
  <EmptyState
    action={<Button>Say hello</Button>}
    description="Create a saved hello-world input."
    title="No inputs yet"
  />
)
