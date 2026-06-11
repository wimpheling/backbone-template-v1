import { fromBinary } from "@bufbuild/protobuf"
import { ConnectError } from "@connectrpc/connect"
import { createClient } from "@connectrpc/connect"
import { createConnectTransport } from "@connectrpc/connect-web"
import {
  AppErrorDetailSchema,
  AppErrorReason,
  GreeterService,
} from "../gen/helloworld/v1/helloworld_pb"

function requireEnv(name: string): string {
  const value = import.meta.env[name]

  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const transport = createConnectTransport({
  baseUrl: requireEnv("VITE_SERVER_URL"),
})

export const greeterClient = createClient(GreeterService, transport)

export type AppErrorMessages = Partial<Record<AppErrorReason, string>>

export function toErrorMessage(
  caught: unknown,
  fallbackMessage: string,
  appErrorMessages: AppErrorMessages = {},
): string {
  const detail = appErrorDetail(caught)

  if (detail !== null) {
    return appErrorMessages[detail.reason] ?? fallbackMessage
  }

  return fallbackMessage
}

type AppErrorDetailView = {
  params: Record<string, string>
  reason: AppErrorReason
  translationKey: string
}

type IncomingAppErrorDetail = {
  debug?: unknown
  type: string
  value: Uint8Array
}

function appErrorDetail(caught: unknown): AppErrorDetailView | null {
  if (!(caught instanceof ConnectError)) {
    return null
  }

  for (const detail of caught.details) {
    if (!isIncomingAppErrorDetail(detail)) {
      continue
    }

    if (!isAppErrorDetailType(detail.type)) {
      continue
    }

    const decoded = decodeAppErrorDetail(detail.value)

    if (decoded !== null) {
      return decoded
    }

    const debug = decodeDebugAppErrorDetail(detail.debug)

    if (debug !== null) {
      return debug
    }
  }

  return null
}

function isIncomingAppErrorDetail(detail: unknown): detail is IncomingAppErrorDetail {
  return (
    detail !== null &&
    typeof detail === "object" &&
    "type" in detail &&
    typeof detail.type === "string" &&
    "value" in detail &&
    detail.value instanceof Uint8Array
  )
}

function decodeAppErrorDetail(value: Uint8Array): AppErrorDetailView | null {
  if (value.byteLength === 0) {
    return null
  }

  try {
    const detail = fromBinary(AppErrorDetailSchema, value)

    return {
      params: Object.fromEntries(detail.params.map((param) => [param.key, param.value])),
      reason: detail.reason,
      translationKey: detail.translationKey,
    }
  } catch {
    return null
  }
}

function decodeDebugAppErrorDetail(debug: unknown): AppErrorDetailView | null {
  if (debug === null || typeof debug !== "object") {
    return null
  }

  const reason = appErrorReasonFromDebug((debug as { reason?: unknown }).reason)
  const translationKey = (debug as { translationKey?: unknown }).translationKey
  const params = (debug as { params?: unknown }).params

  if (reason === null || params === null || typeof params !== "object") {
    return null
  }

  return {
    params: Object.fromEntries(
      Object.entries(params).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string",
      ),
    ),
    reason,
    translationKey: typeof translationKey === "string" ? translationKey : "",
  }
}

function appErrorReasonFromDebug(reason: unknown): AppErrorReason | null {
  switch (reason) {
    case "APP_ERROR_REASON_INVALID_ARGUMENT":
      return AppErrorReason.INVALID_ARGUMENT
    default:
      return null
  }
}

function isAppErrorDetailType(type: string): boolean {
  return (
    type === "helloworld.v1.AppErrorDetail" ||
    type === "type.googleapis.com/helloworld.v1.AppErrorDetail"
  )
}
