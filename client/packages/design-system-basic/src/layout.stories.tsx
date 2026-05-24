import type { Story, StoryDefault } from "@ladle/react"
import { Heading, Layout, Stack, Text } from "."

export default {
  title: "Design System / Layout",
} satisfies StoryDefault

export const Default: Story<{ middleWidthPx: number }> = ({ middleWidthPx }) => (
  <Layout
    middle={
      <Stack gap="md">
        <Text variant="eyebrow">Layout</Text>
        <Heading level={2}>Centered content column</Heading>
        <Text tone="muted">
          The layout component centers one primary content region and constrains its width.
        </Text>
      </Stack>
    }
    middleWidthPx={middleWidthPx}
  />
)
Default.args = {
  middleWidthPx: 680,
}
