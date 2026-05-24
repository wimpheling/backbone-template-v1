import type { Story, StoryDefault } from "@ladle/react"
import { Text } from "."

export default {
  title: "Design System / Text",
} satisfies StoryDefault

export const Default: Story<{
  children: string
  tone: "default" | "muted" | "accent" | "danger"
  variant: "body" | "lede" | "eyebrow"
}> = ({ children, tone, variant }) => (
  <Text tone={tone} variant={variant}>
    {children}
  </Text>
)
Default.args = {
  children: "Design-system text supports body, lede, and eyebrow variants.",
  tone: "default",
  variant: "body",
}
