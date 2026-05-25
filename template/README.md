# Backbone

React + Rust ConnectRPC starter.

## Start Here

```sh
just setup
just full-validation
just dev
```

Prerequisites: Node.js with pnpm, Rust, and `just`.

## Layout

- `client/` - React app built with Vite, pnpm workspaces, Oxlint, and Oxfmt
- `server/` - Rust ConnectRPC server
- `proto/` - shared protobuf definitions
- `e2e/` - Playwright browser tests

## Client Packages

The client is a pnpm workspace rooted at `client/`.

- `backbone-client` (`client/`) - Vite React application package. It owns the app entry point, generated ConnectRPC TypeScript bindings, client-side scripts, and dependencies on the design system and ConnectRPC web client.
- `@backbone/design-system` (`client/packages/design-system/`) - public design-system boundary for app code. It re-exports the active component implementation from `@backbone/design-system-basic` and the shared component types from `@backbone/design-system-contract`.
- `@backbone/design-system-contract` (`client/packages/design-system-contract/`) - type-only contract for supported UI primitives, including layout, stack, inline, text, headings, form fields, inputs, buttons, and notices.
- `@backbone/design-system-basic` (`client/packages/design-system-basic/`) - concrete React and CSS implementation of the design-system contract. It contains the DOM markup and styling used by the app.
- `@backbone/design-system-lint` (`client/packages/design-system-lint/`) - custom Oxlint plugin that protects the design-system boundary by rejecting raw DOM JSX in app code and direct imports from external UI libraries.

## Rust Custom Lints

The server has custom Dylint rules in `server/dylint/backbone_server_lints/`.
They protect server architecture boundaries, such as keeping sqlx usage in
`server/src/db/`, environment reads in config code, and RPC method
implementations split into per-method files.

The Dylint crate intentionally contains its own empty `[workspace]` table. That
is the small Cargo hack that lets the lint crate live under `server/` while
staying out of the root Cargo workspace's normal `cargo check` and `cargo test`
paths. Dylint still builds it explicitly through the root
`[workspace.metadata.dylint]` entry, but regular server compilation does not
treat the lint implementation as application code.

## Commands

```sh
just setup           # install JS deps, Playwright Chromium, and fetch cargo deps
just generate        # generate React protobuf definitions from proto/
just check           # generate, cargo check, client check, vite build
just rust-test       # run Rust tests
just full-validation # run check, Rust tests, and e2e tests
just dev             # run the React client and Rust server together
just ladle           # run the client design-system Ladle
just e2e             # start client/server and test through the UI
just e2e-debug       # run e2e headed/debug, stopping after the first failure
just e2e-ui          # open Playwright UI mode
```

The dev launcher starts the client at `http://127.0.0.1:5173` and the server at
`http://127.0.0.1:8080`, then stops both child processes when the launcher exits.

## Runtime Configuration

The starter keeps SQLite wired in so new features have a real persistence path
from day one. The hello-world RPC records each submitted name in
`hello_world_inputs`.

Every environment variable used by the application must be declared in both
[`.env.schema`](.env.schema) and [`.env.test`](.env.test).

Required server environment variables:

```sh
DATABASE_URL=sqlite://backbone.sqlite?mode=rwc
SERVER_HOST=127.0.0.1
SERVER_PORT=8080
```

Required client environment variables:

```sh
VITE_SERVER_URL=http://127.0.0.1:8080
```
