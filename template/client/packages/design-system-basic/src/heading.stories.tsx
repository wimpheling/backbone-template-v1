import type { Story, StoryDefault } from "@ladle/react"
import { Heading } from "."

export default {
  title: "Design System / Heading",
} satisfies StoryDefault

export const Default: Story<{ children: string; level: 1 | 2 | 3 }> = ({ children, level }) => (
  <Heading level={level}>{children}</Heading>
)
Default.args = {
  children: "Heading",
  level: 1,
}
