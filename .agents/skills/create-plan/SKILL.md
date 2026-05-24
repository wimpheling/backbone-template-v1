---
name: create-plan
description: Create concise implementation plans for the backbone project, including a plain-language explanation, structural changes, and expected end-to-end behaviors. Use when Codex is asked to write, draft, refine, or validate a development plan before implementation.
---

# Writing plans

Plans will be created in markdown format, with three sections: a plain text explanation, structural changes, and expected behaviors. They will be stored in the `.agents/skills/create-plan/plans` directory, with a filename that reflects the content of the plan, prefixed by the date of creation (e.g., `2023-10-01-add-cats.md` for a plan about adding a list of cats to the app).

The agent will first validate the plain text explanation with the user before proceeding to draft the structural changes and expected behaviors. This ensures that the plan is aligned with the user's intentions before investing time in detailing the implementation.

Plans should be formatted this way.

## 0 - Title of the feature/bugfix/improvement

## 1 - Plain text explanation

Just some markdown that explains the changes we are doing and their purpose. We can start by settling on this. It doesn't need to be extremely detailed : it has to be clear, concise and meaningful.

Once this is validated, the other sections can be redacted.

## 2 - structural changes:

- proto files (endpoints, messages)
- DB structures (necessary migrations)
- Pages : do we need to create/delete alter them ? Please write pseudocode for the new pages, and the changes to existing pages
- Design system : do we need new components ? delete some components ? change some components
- React routes : new pages ?

## 3 - expected behaviors (end to end tests)

- changes to e2e tests
- creation of new tests : redact them
- design system and pages : stories creation

# Example of plan

```
# Explanation

We want to add a list of cats in our app because cats are cute and we want to make our users happy.

# Structural changes

- We will add a new endpoint `GET /cats` that will return a list of cats.
- We will add a new page `/cats` that will display the list of cats.
- We will add a new component `CatCard` that will display the information of a cat in a nice way.
- We will add a new frontend route :

# Expected behaviors

```
