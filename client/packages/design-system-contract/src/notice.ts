import type { ComponentType, ReactNode } from "react"

export type NoticeProps = {
  children: ReactNode
  tone: "danger"
}

export type NoticeComponent = ComponentType<NoticeProps>
