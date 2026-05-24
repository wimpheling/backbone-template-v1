---
name: review-plan
description: Review backbone implementation plans before work begins, checking clarity, completeness, technical fit, test strategy, risks, and whether the plan is ready to implement.
---

# Reviewing plans

Use this skill when asked to review, critique, approve, or validate a backbone implementation plan before implementation.

## Workflow

1. Locate the plan the user wants reviewed. If no path is given, look in `.agents/skills/create-plan/plans` and choose the most relevant or most recent candidate.
2. Read the plan and inspect only the codebase context needed to judge it accurately.
3. Review the plan against the project instructions, especially red/green testing and mandatory environment variable behavior.
4. Do not implement the plan unless the user explicitly asks for implementation.

## Review criteria

- The plain-language explanation is aligned with the requested outcome and avoids hidden scope.
- Structural changes cover every affected layer: proto, database, backend, frontend routes, pages, design system, stories, and migrations when relevant.
- Expected behaviors are specific enough to become tests, especially end-to-end tests for visible UI changes.
- The test level is appropriate: no tests for docs/commands/migrations/proto-only changes, unit tests for non-UI technical changes, and end-to-end tests for user-visible flows.
- Red/green sequencing is possible: existing tests can be checked, new failing tests can be written first, and implementation work can make them pass.
- Risks, ambiguous requirements, backwards compatibility concerns, and rollout/migration details are called out.
- Mandatory environment variables are handled explicitly: required env vars must fail fast with clear errors, and optional env vars must not silently default unless the project already requires that exception.

## Output format

Lead with findings, ordered by severity. Each finding should include the plan section or file line when possible, the risk, and the concrete change needed.

Then include open questions or assumptions.

End with one of:

- `Ready to implement` when the plan is clear and complete enough.
- `Needs revision` when changes are required before implementation.

Keep summaries brief. The useful output is the critique, not a retelling of the plan.
