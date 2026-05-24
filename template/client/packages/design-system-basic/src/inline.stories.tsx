import type { Story, StoryDefault } from "@ladle/react"
import { Button, Inline, TextInput } from "."

export default {
  title: "Design System / Inline",
} satisfies StoryDefault

export const Default: Story = () => (
  <Inline>
    <TextInput aria-label="Inline input" placeholder="Inline input" />
    <Button>Action</Button>
  </Inline>
)
