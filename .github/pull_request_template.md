## What this change does

<!-- Describe the behavior this pull request adds or changes and why. Link the task. -->

## A risk I see

<!-- Name at least one risk: what could break, who is affected, and how to roll back. Include compatibility concerns, migrations, and environment variables. -->

## How I used AI

<!-- Required for level 3 and level 5 tasks. Otherwise write "Not applicable". -->

- What I asked:
- What I rejected:
- How I verified it:

## Test evidence

- [ ] `pnpm verify`
- [ ] Relevant integration or E2E tests
- [ ] Manual verification, when applicable

## Screenshots

Add before/after screenshots for visual changes, or write "Not applicable".

## Checklist

- [ ] The change follows the app → features → shared dependency direction.
- [ ] New API data is validated at runtime.
- [ ] Query keys include every input that changes the response.
- [ ] No secrets or private values are exposed through `VITE_*` variables.
- [ ] User-facing states cover loading, errors, and empty data when relevant.
- [ ] Documentation and `.env.example` are updated when required.
