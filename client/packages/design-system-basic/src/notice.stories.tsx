import type { Story, StoryDefault } from "@ladle/react"
import { Notice } from "."

export default {
  title: "Design System / Notice",
} satisfies StoryDefault

export const Default: Story<{ children: string }> = ({ children }) => (
  <Notice tone="danger">{children}</Notice>
)
Default.args = {
  children: "Something needs attention.",
}
