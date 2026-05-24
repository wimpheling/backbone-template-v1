import type { LoaderComponent } from "@backbone/design-system-contract"
import { Text } from "./text"

export const Loader: LoaderComponent = ({ message }) => {
  return (
    <section aria-busy="true" aria-live="polite" className="ds-loader">
      <span className="ds-loader__spinner" />
      <Text tone="muted">{message}</Text>
    </section>
  )
}
