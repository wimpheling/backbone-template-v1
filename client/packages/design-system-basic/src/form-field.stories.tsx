import type { Story, StoryDefault } from "@ladle/react"
import { FormField, TextInput } from "."

export default {
  title: "Design System / FormField",
} satisfies StoryDefault

export const Default: Story<{ label: string }> = ({ label }) => (
  <FormField inputId="ladle-field" label={label}>
    <TextInput id="ladle-field" placeholder="Field input" />
  </FormField>
)
Default.args = {
  label: "Field label",
}
