# create-backbone-template

Create a Backbone starter project.

Backbone is a spec-driven full-stack app template for building React and Rust
ConnectRPC services with a working client, server, protobuf contract, SQLite
persistence, generated TypeScript bindings, design-system boundaries, and
Playwright e2e coverage from the first commit.

This package is the project creator. It copies the template into a new
directory, personalizes the project name, restores dotfiles, and leaves the
generated project with its own README containing the first setup commands.

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

## Publishing

The package is published by the `Publish` GitHub Actions workflow.

For release-based publishing:

1. Bump the root `package.json` version.
2. Commit the version bump.
3. Create and publish a GitHub release tagged `vX.Y.Z`.
4. The release workflow verifies the tag matches `package.json` and runs
   `npm publish --provenance --access public`.

For manual publishing, run the `Publish` workflow from GitHub Actions and enter
the package version without the leading `v`.

The npm package should be configured for trusted publishing with:

- Package: `create-backbone-template`
- Publisher: GitHub Actions
- Workflow: `.github/workflows/publish.yml`
