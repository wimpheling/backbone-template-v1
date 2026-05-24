import type { StoryDefault } from "@ladle/react"
import { Button, Stack } from "."

export default {
  title: "Design System / Button",
} satisfies StoryDefault

export const Primary = () => <Button>Say hello</Button>

export const Secondary = () => <Button variant="secondary">View history</Button>

export const Danger = () => <Button variant="danger">Clear history</Button>

export const DisabledPrimary = () => <Button disabled>Say hello</Button>

export const DisabledSecondary = () => (
  <Button disabled variant="secondary">
    View history
  </Button>
)

export const DisabledDanger = () => (
  <Button disabled variant="danger">
    Clear history
  </Button>
)

export const LoadingPrimary = () => <Button loading>Saving...</Button>

export const LoadingSecondary = () => (
  <Button loading variant="secondary">
    Opening...
  </Button>
)

export const LoadingDanger = () => (
  <Button loading variant="danger">
    Clearing...
  </Button>
)

export const AllVariants = () => (
  <Stack gap="sm">
    <Button>Say hello</Button>
    <Button variant="secondary">View history</Button>
    <Button variant="danger">Clear history</Button>
    <Button disabled>Saved</Button>
    <Button loading>Saving...</Button>
  </Stack>
)
