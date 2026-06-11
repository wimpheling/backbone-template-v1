# Spec Engine

Spec Engine extracts a small, typed, serializable description of an app.

The current implementation contains one component: `spec-extractor`. It reads a
project from disk and generates JSON for the static client surface we have
agreed to model first:

- app name
- client design-system components
- Ladle stories for those components
- client pages
- route path for each page
- nested page component structure, using component names only
- Ladle stories for each page

It intentionally does not extract props, TypeScript type bodies, event handlers,
state mappings, RPC contracts, database schema, or server structure yet.

## Usage

From the root of a generated project:

```sh
cargo run -p spec-engine --bin spec-extractor -- --project-root . --out spec/app-spec.json
```

The template also provides a shortcut:

```sh
just spec-extract
```

The generated file is written to:

```txt
spec/app-spec.json
```

To print JSON to stdout instead of writing a file:

```sh
cargo run -p spec-engine --bin spec-extractor -- --project-root .
```

## Output Shape

The JSON follows this shape:

```ts
type AppSpec = {
  schemaVersion: 1
  app: {
    name: string
  }
  client: {
    components: ClientComponentSpec[]
    pages: ClientPageSpec[]
  }
}

type ClientComponentSpec = {
  name: string
  stories: LadleStorySpec[]
}

type ClientPageSpec = {
  id: string
  name: string
  routePath: string
  components: PageComponentNodeSpec[]
  stories: LadleStorySpec[]
}

type PageComponentNodeSpec = {
  name: string
  children?: PageComponentNodeSpec[]
}

type LadleStorySpec = {
  name: string
  file: string
}
```

The page component tree contains only component names and nesting. It ignores
props, prop bindings, callbacks, text content, raw DOM tags, and TypeScript
types.

## Current Extraction Conventions

Spec Engine currently relies on the project conventions:

- the app name comes from root `package.json`
- reusable client components live in
  `client/packages/design-system-basic/src/*.tsx`
- component stories live next to each component as `*.stories.tsx`
- pages live in `client/src/pages/**/*-page.tsx`
- page stories live next to pages as `*-page.stories.tsx`
- routes are declared in `client/src/App.tsx` with React Router `Route`
- page route adapters are named `<PageName>Route`
- page structure is extracted from capitalized JSX tags

This keeps v1 simple and useful without introducing a second UI language or
reimplementing TypeScript's type system.

## Project Direction

This project is moving toward a spec-driven development surface. The goal is to
make the static parts of an app visible as typed, reviewable data that can later
be rendered as a human-readable HTML document.

The first question was what counts as the app's "static parts." In the current
template, there are many candidates: routes, page contracts, page stories,
design-system components, protobuf RPC contracts, Gherkin scenarios, database
migrations, environment schema, and architecture lint rules.

For the first pipeline, we decided to start smaller. The first spec should
describe the client structure, not every implementation detail. It should show
which components and pages exist, where pages are routed, which stories document
them, and what component structure each page uses.

We explicitly chose not to duplicate TypeScript prop typings inside the spec.
Props and callback types remain in TypeScript source for now. If a later
document generator needs type details, it can inspect TypeScript source
separately rather than making the spec object recreate TypeScript inside
TypeScript.

The spec root includes a `client` property because server extraction will be
added later as a sibling surface.

## Tests

Spec Engine has two layers of tests:

- Rust unit tests cover extractor behavior on small fixture projects and JSX
  component-tree extraction.
- The package creator has an end-to-end test that creates a fresh project, runs
  `spec-extractor`, and asserts the generated JSON.

Run the Rust tests:

```sh
cargo test -p spec-engine
```

Run the full workspace Rust tests:

```sh
cargo test --workspace
```

Run the package creator tests, including the generated-project extraction test:

```sh
npm test
```

## Next Steps

- Generate a human-readable HTML document from `spec/app-spec.json`.
- Add source references to components, pages, and stories so generated docs can
  link back to files.
- Decide whether the page tree should include optional section labels while
  still avoiding props.
- Add a server section with RPC services and methods from `proto/`.
- Add behavior references from Gherkin feature files.
- Add environment contract extraction from `.env.schema`.
- Consider using a real TypeScript parser if the lightweight JSX scanner becomes
  too fragile.
- Add validation that the extracted spec stays stable and intentional as the
  template grows.
