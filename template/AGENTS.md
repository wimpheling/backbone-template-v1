This is backbone: an spec-driven dev UI.

# Methodology

# API and integration style

Prefer protobuf and gRPC for service boundaries and internal APIs. New APIs should use proto definitions and gRPC by default, and agents should actively avoid introducing REST endpoints when a proto/gRPC interface is practical.

REST is still allowed, but only when there is a clear need that gRPC does not satisfy. Typical valid cases are third-party integrations that require HTTP callbacks, such as webhooks, or external APIs whose protocol is fixed by another system. When adding REST, keep the scope narrow and document why REST is necessary for that endpoint.

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
