This is backbone: an spec-driven dev UI.

# Methodology

# API and integration style

Prefer protobuf and gRPC for service boundaries and internal APIs. New APIs should use proto definitions and gRPC by default, and agents should actively avoid introducing REST endpoints when a proto/gRPC interface is practical.

REST is still allowed, but only when there is a clear need that gRPC does not satisfy. Typical valid cases are third-party integrations that require HTTP callbacks, such as webhooks, or external APIs whose protocol is fixed by another system. When adding REST, keep the scope narrow and document why REST is necessary for that endpoint.

# Client page architecture

`client/src/App.tsx` is only the application shell. It may compose routing and page route adapters, but it must not contain product UI, page-specific state, RPC clients, async feature logic, or direct imports from `@backbone/design-system`.

Pages are split into a presentational page template and a stateful route adapter:

- `client/src/pages/<name>/<name>-page.tsx` is the dumb UI component. It receives all display data through `<Name>PageStaticProps`, all behavior through `<Name>PageDynamicProps`, imports design-system primitives, and exports preview states for stories.
- `client/src/pages/<name>/<name>-page-state.ts` owns the Zustand store, API clients, generated RPC imports, async actions, and state transitions for that page. It must not import the page component or design-system package.
- `client/src/pages/<name>/<name>-page-route.tsx` reads from the Zustand store and maps state/actions into the page template props. It must not import design-system primitives directly.

When adding or changing UI, put the visual structure in the `*-page.tsx` file and the app behavior in the sibling `*-page-state.ts`/`*-page-route.tsx` files. The custom client architecture lint checks this split.

# Red/Green testing

This project uses red/green testing.

When making changes, follow this order

- What level of tests should change ? None, unit tests, end to end tests. Validate with user.
- Run existing tests and verify they are green. Check how long running the tests took.
- Modify tests with the expected changes (except the rare cases where no tests are asked, TBV with user)
- Run and verify tests are red
- Implement until tests are green
- Check if full test suite time is now significantly slower. If this is the case : optimise or check with user.

## How to know what level of test is needed (not definitive)

This section is experimental. You can discuss with user and challenge the guidelines if you think they are not appropriate to your current isue.

### No tests :

- just commands
- shell tools
- documentation
- database migrations
- proto files

### Only unit tests:

- technical refacto
- technical changes not visible in UI ?

### End to end tests

When the changes are visible in the front end (typically but not only : new features, new UX flows etc)

# Commiting (only when user asks)

Only commit when the user has explicitely asked you. Never take the initiative to commit.

When the user asks you to commit here is the workflow:

- Run all the tests using `just full-validation` with required escalation. The full validation includes end to end tests that start local dev servers; without escalation, sandboxed runs can fail to bind to localhost with `listen EPERM`, which is a sandbox permission failure rather than a test failure.
- If tests red, cancel commit
- If tests green : check the committed changes, and suggest a commit message with user, until he approves.
- Commit with required filesystem escalation when needed. Git staging and commit operations write repository metadata such as `.git/index.lock`, which may fail in the sandbox with a read-only filesystem error.
- Don't Push for now (not possible in your sandbox)

# Mandatory ENV variables

In the Rust and typescript code, env variables are always mandatory. In the exceptional case where they are optional, they will not have a default value (except empty values).

When necessary env vars are not present, the apps should crash with an explicit error message.

Every environment variable used by the application must be declared in both [`.env.schema`](.env.schema) and [`.env.test`](.env.test).

Use `.env.local` for developer-specific local values and secrets. Do not rely on `.env.local` as the only declaration for an environment variable; the variable still belongs in `.env.schema`, and test values still belong in `.env.test`.
