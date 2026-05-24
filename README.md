# create-backbone-template

Create a Backbone starter project.

```sh
npm create backbone-template@latest my-app
```

Equivalent commands:

```sh
pnpm create backbone-template my-app
npx create-backbone-template my-app
```

The generated project contains the React client, Rust ConnectRPC server, shared
protobuf definitions, SQLite wiring, design-system packages, and Playwright e2e
tests from the Backbone template.

## Development

Run the creator locally:

```sh
node bin/create-backbone-template.js /tmp/my-app
```

Verify the package:

```sh
npm test
npm pack --dry-run
```
