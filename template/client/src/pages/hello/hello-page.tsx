import {
  Button,
  Form,
  FormField,
  Heading,
  Inline,
  Layout,
  Navigation,
  Notice,
  Stack,
  Text,
  TextInput,
} from "@backbone/design-system"
import type { Page } from "../page"

export type HelloPageStaticProps = {
  eyebrow: string
  title: string
  greeting: string
  name: string
  nameLabel: string
  namePlaceholder: string
  navigationCurrentHref: string
  navigationItems: { href: string; label: string }[]
  submitLabel: string
  isSubmitting: boolean
  error: string | null
}

export type HelloPageDynamicProps = {
  onNameChanged(value: string): void
  onSubmitted(): void
}

export const helloPageDynamicPropKeys = ["onNameChanged", "onSubmitted"] as const

export type HelloPageProps = HelloPageStaticProps & HelloPageDynamicProps

export const HelloPage: Page<HelloPageStaticProps, HelloPageDynamicProps> = ({
  eyebrow,
  title,
  greeting,
  name,
  nameLabel,
  namePlaceholder,
  navigationCurrentHref,
  navigationItems,
  submitLabel,
  isSubmitting,
  error,
  onNameChanged,
  onSubmitted,
}) => {
  return (
    <>
      <Navigation currentHref={navigationCurrentHref} items={navigationItems} />
      <Layout
        middle={
          <Stack gap="lg">
            <Stack gap="sm">
              <Text variant="eyebrow">{eyebrow}</Text>
              <Heading id="app-title">{title}</Heading>
              <Text tone="muted" variant="lede">
                {greeting}
              </Text>
            </Stack>

            <Form
              ariaLabelledBy="app-title"
              onSubmit={(event) => {
                event.preventDefault()
                onSubmitted()
              }}
            >
              <FormField inputId="name" label={nameLabel}>
                <Inline>
                  <TextInput
                    id="name"
                    name="name"
                    onChange={(event) => onNameChanged(event.target.value)}
                    placeholder={namePlaceholder}
                    value={name}
                  />
                  <Button disabled={isSubmitting} type="submit">
                    {submitLabel}
                  </Button>
                </Inline>
              </FormField>
            </Form>

            {error && <Notice tone="danger">{error}</Notice>}
          </Stack>
        }
        middleWidthPx={680}
      />
    </>
  )
}
