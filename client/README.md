# Client

React client application built with Vite and TypeScript, using pnpm workspaces,
Oxlint, and Oxfmt.

## Design system

The client UI is composed through `@backbone/design-system`, which re-exports a concrete implementation while preserving the abstract component contract from `@backbone/design-system-contract`. App code imports layout, text, form, and control primitives from that boundary instead of rendering DOM elements directly. The actual HTML and styling live inside the design-system implementation package, so the app stays decoupled from markup and visual details. A custom Oxlint plugin enforces this by rejecting raw DOM JSX and direct imports from external UI libraries outside the design-system boundary.

## Scripts

```sh
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run lint
pnpm run format
pnpm run check
```
