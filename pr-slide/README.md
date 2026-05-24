# PR Slide

Slidev workspace for generating and watching PR presentations from the current branch.

## Generate The Deck

```bash
just pr-slide-generate
```

This creates:

```text
.agents/pr-presentation/<branch-name>/slides.md
.agents/pr-presentation/<branch-name>/manifest.json
```

Branch names are normalized into one directory. For example, `feat/hello-history` becomes:

```text
.agents/pr-presentation/feat-hello-history/slides.md
```

## Watch The Presentation

```bash
just pr-slide
```

This regenerates the current branch deck and starts Slidev dev mode. The terminal prints the local URLs, usually:

```text
http://localhost:3030/
http://localhost:3030/presenter/
http://localhost:3030/overview/
```

You can pass Slidev options through pnpm when needed:

```bash
pnpm --filter @backbone/pr-slide run dev -- --port 3031
```

## List Presentations

```bash
just pr-slide-list
```

This prints every generated deck under:

```text
.agents/pr-presentation/
```

## Open A Specific Presentation

```bash
just pr-slide-open feat-hello-history
```

This opens an existing deck without regenerating the current branch deck.

You can pass Slidev options through the lower-level command:

```bash
pnpm --filter @backbone/pr-slide run open -- feat-hello-history --port 3031
```

## Edit The Slides

Edit the generated `slides.md` directly:

```text
.agents/pr-presentation/<branch-name>/slides.md
```

Regenerating will overwrite the deck, so keep manual polish for the final pass after the generated structure looks right.

## Export

```bash
pnpm --filter @backbone/pr-slide run export -- --format pptx
```

Other useful export formats are `pdf`, `png`, and `md`.

## Generator Options

```bash
pnpm --filter @backbone/pr-slide run generate -- --title "Catchy PR Title"
pnpm --filter @backbone/pr-slide run generate -- --purpose "What reviewers should remember."
pnpm --filter @backbone/pr-slide run generate -- --git-base main
pnpm --filter @backbone/pr-slide run generate -- --deck-out .agents/pr-presentation/custom-name
```
