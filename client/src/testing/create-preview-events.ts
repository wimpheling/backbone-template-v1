type DynamicPropKey<TDynamicProps> = keyof TDynamicProps & string

export type PreviewDynamicPropCall<TDynamicProps> = {
  name: DynamicPropKey<TDynamicProps>
  args: unknown[]
}

export type CreatePreviewDynamicPropsOptions = {
  record?: boolean
}

export function createPreviewDynamicProps<TDynamicProps extends object>(
  dynamicPropKeys: readonly DynamicPropKey<TDynamicProps>[],
  options: CreatePreviewDynamicPropsOptions = {},
) {
  const calls: Array<PreviewDynamicPropCall<TDynamicProps>> = []
  const dynamicProps = {} as TDynamicProps

  for (const dynamicPropKey of dynamicPropKeys) {
    Object.assign(dynamicProps, {
      [dynamicPropKey]: (...args: unknown[]) => {
        if (options.record === true) {
          calls.push({ name: dynamicPropKey, args })
        }
      },
    })
  }

  return { calls, dynamicProps }
}
