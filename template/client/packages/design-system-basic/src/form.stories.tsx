import type { Story, StoryDefault } from "@ladle/react"
import type { FormEvent } from "react"
import { Button, Form, FormField, Heading, Inline, Stack, TextInput } from "."

export default {
  title: "Design System / Form",
} satisfies StoryDefault

export const Default: Story = () => (
  <Form ariaLabelledBy="ladle-form-title" onSubmit={preventSubmit}>
    <Stack gap="md">
      <Heading id="ladle-form-title" level={3}>
        Form
      </Heading>
      <FormField inputId="ladle-form-name" label="Name">
        <Inline>
          <TextInput id="ladle-form-name" placeholder="World" />
          <Button type="submit">Submit</Button>
        </Inline>
      </FormField>
    </Stack>
  </Form>
)

function preventSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
}
