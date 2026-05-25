# Variant: PR Slides

This branch is a maintained Backbone template variant named `variant/pr-slides`.
It layers a Slidev-based PR presentation workspace on top of the base template so
projects can generate, watch, list, and open branch-specific review decks from
the current Git diff.

The variant adds the `template/pr-slide` package and `just` commands such as
`pr-slide-generate`, `pr-slide`, `pr-slide-list`, and `pr-slide-open`. Generated
decks live under `.agents/pr-presentation/<branch-name>/`.

Use the `variant/<capability>` branch naming convention for long-lived alternate
toolkit branches that are periodically rebased from `main`.

# create-backbone-template

Create a Backbone starter project: a rigid, spec-driven harness for building
with AI coding agents.

Backbone is for vibe coders who want the speed of AI-assisted development
without letting the project dissolve into loose conventions. It provides an
opinionated full-stack environment where as much of the app as possible is
defined before implementation: protobuf contracts, route structure, generated
bindings, design-system boundaries, and behavior-focused end-to-end tests.

The goal is not to make the smallest starter kit. The goal is to make a sturdy
engineering frame that keeps both humans and agents oriented. Backbone favors
declarative surfaces, strict compilation, narrow architectural choices, and
repeatable planning rituals so that features are shaped before effective
implementation begins.

## Getting Started

```sh
npm create backbone-template@latest my-app
```

Equivalent commands:

```sh
pnpm create backbone-template my-app
npx create-backbone-template my-app
```

The generated project contains a React client, Rust ConnectRPC server, shared
protobuf definitions, SQLite persistence, generated TypeScript bindings,
design-system packages, custom linting boundaries, and Playwright/Cucumber e2e
coverage from the first commit.

## Why Backbone Exists

AI coding agents are surprisingly good at working inside rigid systems. They
are much less reliable when the project leaves every architectural choice open.
Backbone leans into that: it gives the agent a tight framework, then exposes the
important parts of the application as declarative, reviewable artifacts.

Those artifacts become the shared planning surface. A route, a proto service, a
Gherkin scenario, or a lint rule is not just implementation detail; it is a
piece of the product definition that can be discussed before the code underneath
it exists.

## Core Choices

- Definition-first: proto files, routing declarations, and e2e scenarios form a
  declarative surface that can define a significant part of the app before
  implementation begins.
- Composition skills: the template includes a minimal set of agent skills for a
  planning methodology where declarative logic is modeled in the plan and
  reviewed in discussion.
- Strict by default: TypeScript, Rust with strict lints, protobuf contracts, and
  generated bindings create a clear cross-language compilation platform.
- Custom linters: project-specific lint rules let the repository enforce
  higher-level code organization standards, not only syntax and formatting.
- Behavior-readable tests: Cucumber/Gherkin keeps planning readable and turns
  behavior into executable checks.
- Fast enough to stay in flow: Rust, protobuf, ConnectRPC, and generated code
  are modern, high-performance choices. They may be less familiar than
  TypeScript-only, Python, or REST-heavy stacks, but that rigidity gives AI a
  stronger shape to work inside.

## Where This Is Going

- Treat custom linters as a constant quality-improvement loop, with AI helping
  propose and implement rules while humans keep the rule set intentional.
- Let Backbone evolve from a template toward a framework where useful pieces,
  such as custom linters, can be published as separate libraries. That would
  make upgrades easier and increase consistency, while trading off some of the
  organic local control users have today by editing the template directly.
- Move more declarative elements directly into the planning phase: code as spec,
  reviewed before implementation.
- Build UI around planning, reading, and discussion so the project is not only a
  generated codebase, but a better working surface for collaborating with
  agents.

## Package Creator

This package is the project creator. It copies the template into a new
directory, personalizes the project name, restores dotfiles, and leaves the
generated project with its own README containing the first setup commands.

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
