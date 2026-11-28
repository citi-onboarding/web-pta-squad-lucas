## 1. SDD

- [x] 1.1 Write proposal, delta spec, design and tasks
- [x] 1.2 Developer reviews the artifacts and confirms the first Red
- [x] 1.3 Record the answers to the design open questions and update the spec before the work that depends on them (does not block cycle A)
  - Partial: João approved the failure messages, field validation, pending label and email whitespace handling on 2026-11-28; spec and design are updated. The GIF evidence question was closed by recording against a real backend (8.3). Ignoring letter case needs a separate backend change.

## 2. Cycle A: sign-in screen

Each Red, Green and Refactor transition in cycles A to F needs explicit confirmation. A Refactor with no concrete gain is skipped with the reason recorded. A test that already passes is recorded as regression coverage, not as Red.

- [x] 2.1 Red: developer writes the "Screen content" test in `src/app/router.test.tsx` and records the failure
  - João approved the first Red. Production code is unchanged.
  - Evidence (run by the coordinator): `./node_modules/.bin/vitest run src/app/router.test.tsx` exited 1 with `Tests 1 failed | 2 passed (3)`. `/entrar` rendered the not-found route, and the "Entrar no portal" heading assertion failed with `TestingLibraryElementError` (`router.test.tsx:26`).
  - `pnpm typecheck` and `pnpm format:check` passed. Strict OpenSpec validation passed (reported by the coordinator).
- [x] 2.2 Green: minimal screen at `/entrar`
  - João approved this Green. The Red test is unchanged. The button does not submit; sign-in belongs to cycle B.
  - Evidence: `./node_modules/.bin/vitest run src/app/router.test.tsx` passed (3 of 3). `pnpm verify` passed (typecheck, lint, 59 tests in 18 files, `openspec validate --all --strict`, skills check). `pnpm format:check` passed before this note was added.
  - Pending: Playwright + axe and 390 px coverage for this screen (cycle F). `pnpm test:e2e`, `pnpm test:coverage` and `pnpm build` were not run in this phase. No visual browser check was made.
- [x] 2.3 Refactor review
  - Skipped with João's approval; cycle A is closed. No concrete gain: the form is small, the common input classes are already shared, and the Green run passed 3 of 3.

## 3. Cycle B: sign-in and destinations

- [x] 3.1 Red: developer writes MSW tests for successful, rejected and invalid sign-in, the cookie-based request and the four destinations (failure and field behavior depend on 1.3)
  - Partial: João approved only the successful sign-in Red (four destinations and the cookie-based sign-in request). Rejected and invalid sign-in tests are still pending. Production code was not changed in this phase.
  - The test in `src/app/router.test.tsx` uses the real routes, simulates `POST api/v1/auth/login` with MSW and wraps the router in a `QueryClientProvider`. It checks the body (`client: "web"`), `credentials: "include"`, no `Authorization` header, the destination heading and the path. Storage, identity and sign-out checks of "Cookie-based requests" belong to later cycles.
  - Evidence: `./node_modules/.bin/vitest run src/app/router.test.tsx -t "signs in with the cookie session"` exited 1 with 4 failed and 3 skipped. All four roles failed at `router.test.tsx:103` with `AssertionError: expected [] to have a length of 1 but got +0`: the form was filled and "Entrar" clicked, but no request was sent. The destination assertions were not reached. The whole file reported 4 failed and 3 passed (7).
  - Pending: typecheck and format check were not run (`pnpm` was not on the PATH, and the local `tsc` and `prettier` commands required approval that was not granted).
  - Coordinator check of the successful sign-in Red: `./node_modules/.bin/vitest run src/app/router.test.tsx` reported `Tests 4 failed | 3 passed (7)`, with no sign-in request sent. `./node_modules/.bin/tsc --noEmit` and `./node_modules/.bin/prettier --check .` passed before this note was added.
  - Successful sign-in slice, Refactor: skipped with João's approval. No concrete gain: the layers are small with no relevant duplication; sharing the API client is only needed once identity exists (cycle C).
  - Failure Red: added the rejected-credentials and invalid-success-response tests. `./node_modules/.bin/vitest run src/app/router.test.tsx` exited 1 with 1 failed and 8 passed (9). The `401` test failed at `router.test.tsx:154` because "E-mail ou senha incorretos" was not found. The invalid-response test passed on first run, so it is regression coverage, not Red. `tsc --noEmit` and `eslint src` passed. Production code was not changed. Tests for the other failure messages remain pending on 1.3.
  - Failure Green: João approved the rejected-credentials Green. The sign-in screen shows the fixed message with `role="alert"` when the API answers `401`; the Red tests are unchanged. The router test passed (9 of 9). Through local binaries, `tsc --noEmit`, `eslint .`, `vitest run` (65 tests in 18 files), strict OpenSpec validation of all changes and the skills check passed. `prettier --check .` passed before this note was added.
  - Refactor of the sign-in tests: approved by João. Extracted the login URL, `renderSignIn` and `submitSignIn` in `src/app/router.test.tsx`; scenarios, assertions and production code are unchanged. The router test passed (9 of 9). Through local binaries, `tsc --noEmit`, `eslint .`, `vitest run` (65 tests in 18 files), strict OpenSpec validation of all changes and the skills check passed. `prettier --check .` passed before this note was added.
  - Failure messages Red: João approved the texts and this Red. Added failure message, retry, required field and pending submission tests across `sign-in.test.tsx`, `session.test.tsx` and `sign-out.test.tsx`, after updating the delta spec and design. Production code was not changed. Evidence: `./node_modules/.bin/vitest run src/app --reporter=verbose` exited 1 with 18 failed and 77 passed (95): no alert, empty forms submitted, and fields not required. The malformed email was already not submitted; that case fails only on the required fields. "Identity failure on the sign-in screen keeps only the form" passed on first run and is regression coverage. `tsc --noEmit`, `eslint .`, `prettier --check .` and strict validation of the change passed. A request timeout has no separate test; the network error covers the connection reason.
- [x] 3.2 Green
  - Failure messages Green: João approved it. `getFailureReason` chooses the approved text; sign-in, identity (root and internal pages, with retry) and sign-out show it; the fields are required and the pending button reads "Entrando…". Red tests are unchanged.
  - Evidence: `src/app` tests passed (95 of 95). Through local binaries, `tsc --noEmit`, `eslint .`, `vitest run --coverage` (149 tests in 22 files; 98.8% statements, 96.92% branches), strict OpenSpec validation, the skills check, `vite build` and `playwright test` (14 of 14, reusing a local preview) passed. `prettier --check .` passed before this note was added.
  - Pending, found by code reading and not reproduced: with the default TanStack Query network mode, requests pause while the browser reports being offline, so the connection reason would not appear (sign-in would stay on "Entrando…", pages blank). It needs a Red before any fix. The identity and sign-out alerts have no 390 px Playwright coverage yet.
  - Partial: João approved the successful sign-in Green, with native email validation as a provisional decision (see design open questions). Failure handling is still pending. Destination pages show only the title and are not protected yet.
  - The "Screen content" test now renders inside a `QueryClientProvider`; its assertions are unchanged.
  - Evidence: `./node_modules/.bin/vitest run src/app/router.test.tsx` passed (7 of 7). The corepack `pnpm` install is broken, so the `verify` steps ran through local binaries: `tsc --noEmit`, `eslint .`, `vitest run` (63 tests in 18 files), `openspec validate --all --strict --no-interactive` and `node scripts/check-agent-skills.mjs` passed. `prettier --check .` passed before this note was added.
  - Not run: coverage, build, Playwright + axe, real browser or backend.
- [x] 3.3 Refactor review
  - Skipped with João's approval: message choice is already in one function; the similar alert markup does not justify another component.
- [x] 3.4 Red: offline browser
  - João approved this Red. Added the "Browser reports being offline" scenario to the delta spec and `src/app/offline.test.tsx` (sign-in, identity check on navigation with retry, sign-out). Production code was not changed.
  - Evidence: `./node_modules/.bin/vitest run src/app/offline.test.tsx --reporter=verbose` exited 1 with 3 failed (3), each because no alert appeared; the sign-in button stayed on "Entrando…". This confirms the pending point noted in 3.2. `tsc --noEmit`, `eslint .`, `prettier --check .` and strict validation of the change passed.
- [x] 3.5 Green: offline browser
  - João approved this Green. The identity query and the sign-in and sign-out mutations use `networkMode: "always"` (design D3). Red tests are unchanged.
  - Evidence: the offline tests passed (3 of 3). Through local binaries, `tsc --noEmit`, `eslint .`, `vitest run --coverage` (152 tests in 23 files; 98.8% statements, 96.92% branches), strict OpenSpec validation, the skills check, `vite build` and `playwright test` (14 of 14, reusing a local preview) passed. `prettier --check .` passed before this note was added. Offline behavior was not checked in a real browser.
- [x] 3.6 Refactor review: offline browser
  - Skipped with João's decision: three configuration lines, each next to its operation.

## 4. Cycle C: identity, restore and anonymous access

- [x] 4.1 Red: developer writes tests for restore, pending and failed identity, direct access, root and authenticated entry, and updates the obsolete home route test
  - João approved this Red. Production code was not changed. The home route test became the anonymous-root test, and `providers.test.tsx` now expects sign-in for an anonymous visitor. Existing sign-in tests stub identity as anonymous (authenticated after a successful sign-in), and the "Screen content" heading assertion now waits.
  - Evidence: `./node_modules/.bin/vitest run src/app/router.test.tsx src/app/providers.test.tsx` exited 1 with 13 failed and 8 passed (21). All new and updated cycle C tests failed: internal content shown without a decision, no identity request, or no redirect. The 8 passing tests are earlier sign-in, screen and not-found coverage. `tsc --noEmit` and `eslint .` passed.
- [x] 4.2 Green
  - João approved this Green, showing the sign-in form while identity is pending or has failed. Red tests are unchanged. `home-page.tsx` is no longer routed but is kept because `scripts/remove-example.mjs` and the generator tests refer to it.
  - Evidence: router and providers tests passed (21 of 21). Through local binaries, `tsc --noEmit`, `eslint .`, `vitest run` (76 tests in 18 files), strict OpenSpec validation of all changes and the skills check passed. `prettier --check .` passed before this note was added.
  - Pending: refetching identity on navigation (design D3) has no test yet (cycle E). Found by code reading, not reproduced: an identity request still in flight on the sign-in screen could answer `401` after a successful sign-in and overwrite the signed-in identity. It needs a spec scenario and a Red before any fix.
- [x] 4.3 Refactor review
  - Skipped with João's decision. No duplication or mixed responsibility justified a change.
- [x] 4.4 Red: late anonymous identity answer after sign-in
  - João asked to fix this race. Added the "Late anonymous identity answer" scenario to the delta spec and its test. Production code was not changed.
  - Evidence: `./node_modules/.bin/vitest run src/app/router.test.tsx` exited 1 with 1 failed and 20 passed (21). The destination appeared, then the late `401` sent the user back: expected `/painel`, received `/entrar` (`router.test.tsx:219`). This confirms the race. `tsc --noEmit`, `eslint .` and strict validation of the change passed.
- [x] 4.5 Green: late anonymous identity answer
  - João approved this Green. Sign-in now cancels the pending identity query before writing the signed-in user (design D3 updated). The Red test is unchanged.
  - Evidence: the router test passed (21 of 21). Through local binaries, `tsc --noEmit`, `eslint .`, `vitest run` (77 tests in 18 files), strict OpenSpec validation of all changes and the skills check passed. `prettier --check .` passed before this note was added.
- [x] 4.6 Refactor review: late anonymous identity answer
  - Skipped with João's approval: a few lines in one place, with a comment explaining the cancellation.

## 5. Cycle D: role menu and page access

- [x] 5.1 Red: developer writes table-driven tests for each role's menu and its allowed and refused pages, including contracts
  - João approved this Red. Production code was not changed. The expected menus and pages are written in the test from the spec; menu entries are checked by label, order and link target (design D4). Contracts access is covered by the allowed and refused tables.
  - Evidence: `./node_modules/.bin/vitest run src/app/router.test.tsx --reporter=verbose` exited 1 with 37 failed and 28 passed (65). Failed: 4 menu tests (no navigation), 10 allowed pages that do not exist yet and all 23 refusals. The 7 allowed pages that already exist passed on first run and are regression coverage. `tsc --noEmit`, `eslint .`, `prettier --check .` and strict validation of the change passed.
- [x] 5.2 Green
  - João approved this Green, keeping the menu on the refusal page; no Red assertion covers that yet (to be checked in cycle F). `role-destinations.ts` was replaced by `role-access.ts`, one table for menus, page access and destinations. The "Sair" button has no behavior until cycle E. Red tests are unchanged.
  - Evidence: the router test passed (65 of 65). Through local binaries, `tsc --noEmit`, `eslint .`, `vitest run` (121 tests in 18 files), strict OpenSpec validation of all changes and the skills check passed. `prettier --check .` passed before this note was added.
- [x] 5.3 Refactor review
  - Skipped with João's approval: one table already avoids repetition, and menu and page are separate. No concrete gain.

## 6. Cycle E: sign-out

- [x] 6.1 Red: developer writes tests for success, `401`, failure, back navigation, cache discard, session no longer valid, and absence of stored credentials
  - João approved this Red. Production code was not changed. Added the "Late identity answer after sign-out" scenario to the delta spec before its test. "Session no longer valid" is tested through the next navigation (design D3), including no page content while that check is pending.
  - Evidence: `./node_modules/.bin/vitest run src/app/router.test.tsx --reporter=verbose` exited 1 with 9 failed and 65 passed (74). All 9 new tests failed: sign-out does nothing (no request, no sign-in screen) and navigation does not check identity again. In the cookie test, the storage assertions before sign-out already passed. `tsc --noEmit` and `eslint .` passed.
- [x] 6.2 Green
  - João approved this Green. Red tests are unchanged. Each entry into an internal page now checks identity again before showing content (design D3).
  - Evidence: the router test passed (74 of 74). Through local binaries, `tsc --noEmit`, `eslint .`, `vitest run` (130 tests in 18 files), strict OpenSpec validation of all changes and the skills check passed. `prettier --check .` passed before this note was added.
  - Not covered by a test: clearing the mutation cache on sign-out, which would otherwise keep the sign-in variables, including the password, in memory.
- [x] 6.3 Refactor review
  - João approved a test-only Refactor. The tests formerly in `src/app/router.test.tsx` are now in `sign-in.test.tsx`, `session.test.tsx`, `role-access.test.tsx`, `sign-out.test.tsx` and `router.test.tsx` (not-found only), with shared helpers in `src/app/testing/router-harness.tsx`. Earlier evidence still cites the old file. Production code is unchanged.
  - Evidence: the 74 test names are identical before and after. Of the 22 test blocks, only the three that adopted `endSessionOnSignOut` changed. Through local binaries, `tsc --noEmit`, `eslint .`, `vitest run` (130 tests in 22 files), strict OpenSpec validation of all changes and the skills check passed. `prettier --check .` passed before this note was added.

## 7. Cycle F: 390 px and accessibility

- [x] 7.1 Red: developer writes Playwright + axe tests at 390 px with intercepted API responses, and replaces the obsolete home page end-to-end test
  - João approved this phase. Added `e2e/auth.spec.ts` (sign-in with rejected credentials, menu and destination of the four roles, refusal with menu; light and dark color schemes) and removed the home page test from `e2e/application.spec.ts`. Production code was not changed.
  - Evidence: after `./node_modules/.bin/vite build` and a local preview on port 4173 (reused by Playwright, because `pnpm` is broken), `./node_modules/.bin/playwright test` passed 14 of 14 on first run. This is regression coverage, not Red. `tsc --noEmit` and `eslint .` passed. API responses were simulated; no manual visual check was made.
- [x] 7.2 Green
  - Not needed, with João's approval: no cycle F test failed, so there was no production change.
- [x] 7.3 Refactor review
  - Skipped with João's approval: no concrete gain in the new tests.

- [x] 7.4 Regression coverage: identity and sign-out alerts at 390 px
  - João approved it. Added identity failure (with retry button) and sign-out failure tests to `e2e/auth.spec.ts`, in both color schemes. Production code was not changed.
  - Evidence: after `vite build` and a local preview, `playwright test` passed 18 of 18; the new tests passed on first run, so this is regression coverage. `tsc --noEmit`, `eslint .` and `prettier --check .` passed. API responses were simulated.

## 8. Consolidation

- [x] 8.1 Run `pnpm format:check`, `pnpm verify` (including lint and typecheck), `pnpm test:coverage`, `pnpm build` and `pnpm test:e2e`
  - João approved this run. `pnpm` itself was not run because the corepack install is broken; the equivalent steps ran through local binaries on Node 22.22.1, all with exit 0: `prettier --check .`; `tsc --noEmit`; `eslint .`; `vitest run --coverage` (152 tests in 23 files; 98.8% statements, 96.92% branches, 97.59% functions, 98.78% lines); strict OpenSpec validation of all changes; the skills check; the datetime timezone script; `vite build`; and `playwright test` (18 of 18, reusing a local preview, simulated API). `git diff --check` reported nothing. `pnpm install --frozen-lockfile` was not run.
- [x] 8.2 Run `pnpm exec openspec validate s1-04-web-authentication --strict`
  - Passed through `./node_modules/.bin/openspec`.
- [x] 8.3 Record the 390 px GIF of the four destinations and the blocked seller, labelled as simulated or real backend
  - Recorded from the web production build against a real local backend with seed users, and labelled so in every frame. It is a slideshow of nine screenshots. The file is kept outside the repository (`contexto/tarefas/evidencias/f01-web-destinos-e-bloqueio.gif` in the developer's workspace) for the pull request.
- [x] 8.4 If a compatible same-site setup is available, verify the real browser and backend flow; otherwise record it as not verified
  - João approved it. Setup: web on `http://localhost:5173`, API on `http://localhost:3001` from the local, uncommitted backend integration worktree (base `b161161`), a temporary PostgreSQL 17 container with the four migrations and the seed, ERP sync disabled with a fake URL and key. Headless Chromium, 390 px.
  - Verified with the web development server and again with the production build: anonymous redirect; identical message for wrong password and unknown email; for the four roles, destination, `__Host-session` cookie (`HttpOnly`, `Secure`, `SameSite=Strict`, session cookie), no script-visible storage, reload, cookie removal on sign-out, back navigation and refusal of the revoked cookie; `403`/`200` on `GET /api/v1/sync/runs` by role; seller refused on `/usuarios`; session idle over 8 h (database timestamp moved back) refused on the next navigation; native validation of empty fields (message in English in this browser); connection message with the browser offline; no `Authorization` header. The preflight allowed `http://localhost:5173` and sent no CORS permission headers to another origin. An upper-case email is rejected, as expected until the backend change.
  - The first production-build run, started right after the previous runs, had 3 failures and the GIF script timed out: the backend global limit of 100 requests per minute per IP answered `429`. After waiting for the window to reset, every check passed. HTTPS and deployed domains were not verified.
- [ ] 8.5 Write `docs/changes/s1-04-web-authentication.md` and the web ADR with its index entry
- [ ] 8.6 Obtain explicit confirmation immediately before archiving
