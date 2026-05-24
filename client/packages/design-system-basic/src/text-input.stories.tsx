import type { Story, StoryDefault } from "@ladle/react"
import { TextInput } from "."

export default {
  title: "Design System / TextInput",
} satisfies StoryDefault

export const Default: Story<{ placeholder: string }> = ({ placeholder }) => (
  <TextInput aria-label="Text input" placeholder={placeholder} />
)
Default.args = {
  placeholder: "World",
}
