---
name: create-pr-presentation
description: Generate and refine Slidev PR presentations for the backbone project from the current branch, PR diff, implementation plan, or changed files. Use when Codex is asked to create, update, preview, export, or polish a presentation for a PR, especially one organized around backbone structural elements such as pages, e2e behaviors, design system, backend, DB, and proto changes.
---

# Create PR Presentation

## Workflow

1. Generate or refresh the current PR deck with:

```bash
pnpm --filter @backbone/pr-slide run generate
```

This writes the default deck to `.agents/pr-presentation/<branch-name>/slides.md` and a small manifest beside it. Branch names are normalized into one filesystem-safe directory, so `feat/hello-history` becomes `.agents/pr-presentation/feat-hello-history`.

2. Review the generated deck against the current PR context. Use the current branch diff first, then any relevant plan file in `.agents/skills/create-plan/plans` when it exists.

3. Edit the generated `slides.md` directly when the generated copy needs a stronger product story, more accurate grouping, screenshots, diagrams, or reviewer guidance.

4. Preview the deck with:

```bash
just pr-slide
```

Use `pnpm --filter @backbone/pr-slide run export` when the user asks for a distributable presentation.

Use `just pr-slide-list` to list existing branch decks, and `just pr-slide-open <name>` to open one without regenerating the current branch deck.

## Presentation Shape

Keep the first half product-facing and presentation-like:

- General purpose: catchy, useful, and human. Explain why the PR matters.
- New pages / changed pages: name screens and routes reviewers can recognize.
- Features: describe e2e feature files as product capabilities users can now perform.
- Design system changes: components, stories, tokens, or reusable UI patterns.

Keep the second half more technical:

- Proto changes: endpoints, messages, generated clients, compatibility concerns.
- Database changes: migrations, schema, persistence assumptions, rollout notes.
- Backend changes: services, env vars, integration details.

## Screenshot Guidance

Screenshots are especially valuable for pages, components, and feature flows.

- Use Ladle for design-system components and stories.
- Use the running app or page routes for page-level changes.
- Use Playwright artifacts or screenshots for feature slides when they are available or cheap to capture.
- Save supporting images under the deck directory, for example `.agents/pr-presentation/<branch-name>/assets/`.
- Frame screenshots inside the deck instead of showing raw browser captures full-bleed by default.

Useful starter examples:

- `hello-page.png` for `client/src/pages/hello/hello-page.tsx`
- `helloworld.png` for `e2e/features/helloworld.feature`
- `empty-state.png` for design-system empty-state changes
- `navigation.png` for design-system navigation changes

## Structural Elements

Use these backbone buckets when classifying PR content:

- Pages and React routes
- Features described by e2e files
- Design system components, stories, and tokens
- Backend services and Rust implementation
- Database structures and migrations
- Proto files, endpoints, and messages

## Package

The runnable Slidev project lives in `pr-slide`.

- `pnpm --filter @backbone/pr-slide run generate`: write the deck.
- `pnpm --filter @backbone/pr-slide run list`: list generated branch decks.
- `pnpm --filter @backbone/pr-slide run open -- <name>`: open an existing branch deck.
- `pnpm --filter @backbone/pr-slide run dev`: generate and open Slidev dev mode.
- `pnpm --filter @backbone/pr-slide run build`: generate and build the deck.
- `pnpm --filter @backbone/pr-slide run export`: generate and export through Slidev.

Local generator options use `--git-base`, `--title`, `--purpose`, and `--deck-out`. Other arguments pass through to Slidev.
