import type { ReactElement } from "react"

export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | readonly SerializableValue[]
  | { readonly [key: string]: SerializableValue }

type SerializableProps<TProps> = {
  [Key in keyof TProps]: TProps[Key] extends SerializableValue ? TProps[Key] : never
}

export type PageProps<StaticProps, DynamicProps> = StaticProps & DynamicProps

export type Page<
  StaticProps extends SerializableProps<StaticProps>,
  DynamicProps extends object,
> = (props: PageProps<StaticProps, DynamicProps>) => ReactElement
