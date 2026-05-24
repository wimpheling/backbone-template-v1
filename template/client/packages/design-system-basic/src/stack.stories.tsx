import type { Story, StoryDefault } from "@ladle/react"
import { Stack, Text } from "."

export default {
  title: "Design System / Stack",
} satisfies StoryDefault

export const Default: Story<{ gap: "sm" | "md" | "lg" }> = ({ gap }) => (
  <Stack gap={gap}>
    <Text>First stacked item</Text>
    <Text tone="muted">Second stacked item</Text>
    <Text tone="accent">Third stacked item</Text>
  </Stack>
)
Default.args = {
  gap: "md",
}
