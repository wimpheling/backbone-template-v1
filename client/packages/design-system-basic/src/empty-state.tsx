import type { EmptyStateComponent } from "@backbone/design-system-contract"
import { Heading } from "./heading"
import { Stack } from "./stack"
import { Text } from "./text"

export const EmptyState: EmptyStateComponent = ({ action, description, title }) => {
  return (
    <section className="ds-empty-state">
      <Stack gap="sm">
        <Heading level={2}>{title}</Heading>
        <Text tone="muted">{description}</Text>
      </Stack>

      {action && <div className="ds-empty-state__actions">{action}</div>}
    </section>
  )
}
