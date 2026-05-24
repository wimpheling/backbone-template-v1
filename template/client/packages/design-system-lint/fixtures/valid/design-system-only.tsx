import { Button, Layout, Text } from "@backbone/design-system"

export function ValidApp() {
  return (
    <Layout
      middle={
        <Button type="button">
          <Text>Save</Text>
        </Button>
      }
    />
  )
}
