import { createPreviewDynamicProps } from "../../testing/create-preview-events"
import {
  HelloPage,
  type HelloPageDynamicProps,
  helloPageDynamicPropKeys,
  helloPagePreviewStates,
} from "./hello-page"

const { dynamicProps } = createPreviewDynamicProps<HelloPageDynamicProps>(
  helloPageDynamicPropKeys,
  {
    record: true,
  },
)

export const Ready = () => <HelloPage {...helloPagePreviewStates.ready} {...dynamicProps} />

export const Calling = () => <HelloPage {...helloPagePreviewStates.calling} {...dynamicProps} />

export const Error = () => <HelloPage {...helloPagePreviewStates.error} {...dynamicProps} />
