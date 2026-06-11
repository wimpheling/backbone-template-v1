import { beforeEach, describe, expect, test, vi } from "vitest"

describe("toErrorMessage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv("VITE_SERVER_URL", "http://127.0.0.1:18080")
  })

  test("maps structured app error details without showing raw Connect messages", async () => {
    const { Code, ConnectError } = await import("@connectrpc/connect")
    const { AppErrorReason } = await import("../gen/helloworld/v1/helloworld_pb")
    const { toErrorMessage } = await import("./rpc")

    const error = new ConnectError("server debug text", Code.InvalidArgument, undefined, [
      {
        debug: {
          params: {},
          reason: "APP_ERROR_REASON_INVALID_ARGUMENT",
        },
        type: "helloworld.v1.AppErrorDetail",
        value: new Uint8Array(),
      },
    ] as never)

    expect(
      toErrorMessage(error, "Request failed", {
        [AppErrorReason.INVALID_ARGUMENT]: "Invalid request",
      }),
    ).toBe("Invalid request")
  })

  test("uses fallback copy for unstructured Connect errors", async () => {
    const { Code, ConnectError } = await import("@connectrpc/connect")
    const { toErrorMessage } = await import("./rpc")

    expect(
      toErrorMessage(new ConnectError("backend debug text", Code.Internal), "Request failed"),
    ).toBe("Request failed")
  })
})
