## 1. SDD (specification)

- [x] 1.1 João reviews and accepts `proposal.md`, the three delta specs (including every Portuguese text) and `design.md`, together with the backend contract of `s1-04-user-administration` (endpoints, bodies, `404` for unusable invitations, `409` with `conflictField`), before any test is written. The backend implementation is not required: tests simulate it with MSW.
  - Accepted by João on 2026-11-28, including the Portuguese texts and the grouped cycles.
- [x] 1.2 Run `./node_modules/.bin/openspec validate s1-04-web-user-administration --strict --no-interactive` and confirm it passes.
  - `openspec validate s1-04-web-user-administration --strict --no-interactive` → `Change 's1-04-web-user-administration' is valid` (2026-11-28).

## Rules for every cycle

- A test is Red only when it exercises a spec scenario whose behavior is still missing and fails on its assertion. Run each Red against the unchanged implementation. A test that already passes is recorded as regression coverage, not as Red. A failure for the wrong reason (import error, missing fixture, environment) is not Red evidence. Never introduce a defect to obtain a failure.
- The developer writes the tests of each Red step. Use MSW only for HTTP; fake only the clock and the clipboard.
- During a cycle, run only the tests of that cycle plus `pnpm typecheck`. Full gates run once, in Consolidation.
- Evidence: under each task, record the command and its summary line (for example `Tests 12 passed (12)` or the first failing assertion), and anything not covered by an automated test. No narrative.
- Refactor: propose a change only when it brings a concrete gain; otherwise record the dispensation in one line.

## 2. Cycle 1 — "Usuários" page

- [x] 2.1 Red: tests for every scenario of "User list", "User registration", "Invitation link delivery" and "New invitation link" (Vitest + Testing Library with MSW, pinned time zone, faked clipboard; the narrow viewport scenario in Playwright + axe).
  - Red (tests in `src/app/user-administration.test.tsx`, harness in `src/app/testing/user-administration-harness.tsx`, e2e in `e2e/user-administration.spec.ts`; no production code):
    - `./node_modules/.bin/vitest run src/app/user-administration.test.tsx` → `Tests 17 failed (17)`; first failures: `Unable to find an element with the text: Carregando usuários…`, `Unable to find role="row" and name /Ana Souza/`, `Unable to find role="button" and name "+ Cadastrar usuário"`. All 17 are assertion failures (Red); none is regression coverage.
    - `./node_modules/.bin/vitest run` → `Test Files 1 failed | 23 passed (24)`, `Tests 17 failed | 152 passed (169)` (the 152 are the existing tests).
    - `./node_modules/.bin/vite build` then `./node_modules/.bin/vite preview --host 127.0.0.1 --port 4173` and `./node_modules/.bin/playwright test e2e/user-administration.spec.ts` → `2 failed` (light and dark); `expect(locator).toBeVisible() failed` for `getByRole('row', { name: /Fabiana Costa/ })`. Run with the preview started by hand because `pnpm` is not available to the Playwright web server command.
    - `./node_modules/.bin/tsc --noEmit` → exit 0, no output. `./node_modules/.bin/eslint src/app e2e` → no output. `./node_modules/.bin/prettier --check src/app e2e` → `All matched files use Prettier code style!`.
    - Not covered by an automated test: wire shapes not fixed by any spec (list body is an array of users with `lastLoginAt`, `status`, `invitationExpiresAt`; registration `201` is `{ user, invitation: { token, expiresAt } }`; new invitation `201` is `{ token, expiresAt }`; ERP seller names is an array of strings). Time zone pinned in the test file with `process.env.TZ = "America/Maceio"`.
- [x] 2.2 Green: first move `getFailureReason` and its tests to `src/shared/lib` without changing texts, running the existing `auth` tests (design D1); then create `src/features/user-administration` (API functions with Zod, queries and mutations, page, registration dialog, link dialog, row action) and render it on `/usuarios` for ADMIN (D2, D3, D6, D7); run the tests until they pass.
  - Green, step 1 (move of `getFailureReason` to `src/shared/lib`, texts unchanged; it had no test file of its own): `./node_modules/.bin/vitest run src/app src/features/auth tests` → `Tests 17 failed | 132 passed (149)` (only the 17 Red tests failed; `auth` and `app` tests stayed green).
  - Green, step 2: `./node_modules/.bin/vitest run` → `Test Files 24 passed (24)`, `Tests 169 passed (169)`; `./node_modules/.bin/vitest run src/app/user-administration.test.tsx` → `Tests 17 passed (17)`; `./node_modules/.bin/tsc --noEmit` → exit 0.
  - Red test corrected with João's authorization: "shows the subtitle, the columns and the loading text while the list loads" asserted the end of loading right after the subtitle, which shows immediately. It now awaits the "Ana Souza" row after `release()`. Waiting defect in the test itself; the spec scenario did not change.
  - `./node_modules/.bin/playwright test` (build + manual `vite preview`) → `20 passed`.
  - `./node_modules/.bin/tsc --noEmit` → exit 0; `./node_modules/.bin/eslint .` → exit 0; `./node_modules/.bin/prettier --check src e2e` → ok.
  - Fix outside the Red tests: `handleUserApi` in the harness now copies the fixtures, because the renewal handler mutated shared module fixtures between tests.
  - Not covered by an automated test: native `<dialog>` `showModal` (jsdom has no `showModal`; the dialog falls back to the `open` attribute); the 390 px layout of the dialogs; the real `409` body from the backend.
- [x] 2.3 Refactor or dispensation.
  - Refactor accepted by João: the invitation token stayed in the TanStack mutation cache (`gcTime` default) after the link dialog closed. Set `gcTime: 0` on `registerUserMutationOptions` and `createInvitationMutationOptions` (the mutation observer lives in a dialog that unmounts before the link dialog, so `reset()` could not reach it). Added to "does not show the link again after closing and reloading" an assertion that no mutation in `getMutationCache().getAll()` holds the token.
  - Before the change: `./node_modules/.bin/vitest run src/app/user-administration.test.tsx` → `Tests 1 failed | 16 passed (17)` (`expected true to be false`). After: `Tests 17 passed (17)`; `./node_modules/.bin/vitest run` → `Test Files 24 passed (24)`, `Tests 169 passed (169)`; `./node_modules/.bin/tsc --noEmit` → exit 0.
  - Dispensed by João (small gain): unifying the button and field styles shared by the dialogs.

## 3. Cycle 2 — Invitation page and sign-in notice

- [x] 3.1 Red: tests for every scenario of "Invitation page", "Password creation" and "Sign-in after password creation" (router harness with the real routes; Playwright + axe for the narrow viewport and the flow from link to "Entrar").
  - Red (tests in `src/app/user-invitation.test.tsx`, e2e in `e2e/user-invitation.spec.ts`; no production code; MSW handlers for `POST /api/v1/invitations/lookup` and `/accept` per backend D9a):
    - `./node_modules/.bin/vitest run src/app/user-invitation.test.tsx` → `Tests 13 failed (13)`; first failures: `Unable to find an element with the text: Verificando convite…`, `Unable to find an element with the text: Este link de convite não vale mais…`, `Unable to find a label with the text of: Senha`. All assertion failures (Red); none is regression coverage.
    - `./node_modules/.bin/vitest run` → `Test Files 1 failed | 24 passed (25)`, `Tests 13 failed | 169 passed (182)`.
    - `./node_modules/.bin/vite build` + manual `vite preview` + `./node_modules/.bin/playwright test e2e/user-invitation.spec.ts` → `6 failed` (light and dark); `getByRole('heading', { name: 'Criar senha' })` not found, unusable text not found, `locator.fill` timeout on "Senha".
    - `./node_modules/.bin/tsc --noEmit` → exit 0; `./node_modules/.bin/eslint .` → exit 0.
    - Not covered by an automated test: "does not show the notice again after a reload" fails today only because the earlier steps fail; it cannot be Red on its own until the Green creates the notice. The unit test simulates the reload with a new memory router starting at the current history entry (state included); the Playwright flow does a real reload.
- [x] 3.2 Green: create `src/features/user-invitation`, the public route `/criar-senha` (D4, D8) and the sign-in notice through navigation state (D5); run the tests until they pass.
  - Green: `./node_modules/.bin/vitest run src/app/user-invitation.test.tsx` → `Tests 13 passed (13)`; `./node_modules/.bin/vitest run` → `Test Files 25 passed (25)`, `Tests 182 passed (182)`.
  - Red test corrected with João's authorization: "checks a usable invitation with the token in the body and removes the fragment" did not hold the lookup response, so the loading text was gone before `toBeVisible()` ran. Its lookup handler now waits for a gate released right after the "Verificando convite…" assertion. Waiting defect in the test itself; the spec scenario did not change.
  - `./node_modules/.bin/vite build` + manual `vite preview` + `./node_modules/.bin/playwright test` → `26 passed` (includes `auth`, `user-administration` and `user-invitation`).
  - `./node_modules/.bin/tsc --noEmit` → exit 0; `./node_modules/.bin/eslint .` → exit 0; `./node_modules/.bin/prettier --check src e2e` → ok.
  - Not covered by an automated test: React StrictMode double effect (the lookup is guarded by a ref, but no test runs under StrictMode); a `404` on the lookup caused by the real backend body.
- [x] 3.3 Refactor or dispensation.
  - Dispensed by João: unifying the shared styles was already dispensed in cycle 1, and replacing the `ref` and the `eslint-disable` in the sign-in route brings no gain.

## 5. Cycle 3 — Review fixes (found by `citi-review-change` on 2026-11-28)

- [x] 5.1 Red: tests for every scenario of "Ended session on the user page", "Pending submission cannot be abandoned", "ERP seller names loading and failure", "Another link in the same tab" and "Password creation ends another open session".
  - Red (new files `src/app/user-administration-review.test.tsx`, `src/app/user-invitation-review.test.tsx`, `e2e/review-fixes.spec.ts`; no production code and no existing test changed):
    - `./node_modules/.bin/vitest run src/app/user-administration-review.test.tsx src/app/user-invitation-review.test.tsx` → `Tests 15 failed (15)`; `./node_modules/.bin/vitest run` → `Test Files 2 failed | 25 passed (27)`, `Tests 15 failed | 182 passed (197)`.
    - `./node_modules/.bin/vite build` + manual `vite preview` on 4173 (stopped afterwards) + `./node_modules/.bin/playwright test` → `3 failed`, `26 passed`.
    - Ended session on the user page (list, ERP names, registration, new invitation): Red, `Unable to find role="heading" and name "Entrar no portal"`.
    - Pending submission cannot be abandoned (registration and new invitation): Red, "Cancelar" `toBeDisabled()`; the dialog is gone after its `cancel` event (`toBeInTheDocument()`); in Playwright the dialog is gone after Escape (`toBeVisible()`).
    - Names still loading: Red, field `toBeDisabled()`. Names failure with retry: Red, failure text not found.
    - New link pasted over an unusable one, plus discarded passwords: Red, new greeting not found (Vitest and Playwright).
    - Another account is signed in: Red, no sign-out request (`expected [] to have a length of 1`). Already ended session: Red, same assertion (the notice may appear briefly before the redirect to the signed-in destination). Ending the session fails: Red, failure text not found. No regression coverage.
    - `./node_modules/.bin/tsc --noEmit` → exit 0; `./node_modules/.bin/eslint .` → exit 0; `./node_modules/.bin/prettier --check src e2e` → ok.
    - Chromium check (script outside the repository): with only `preventDefault` on `cancel`, the dialog was open after the 1st and 2nd Escape and closed on the 3rd; also preventing the Escape `keydown` kept it open after 4 presses. The Playwright tests press Escape 3 times.
    - Not covered by an automated test: native Escape in jsdom (covered by the `cancel` event there and by Playwright).
  - "Checking the session fails" (scenario added after the first Red, authorized by João together with the Green), written first and run against the unchanged code: `./node_modules/.bin/vitest run src/app/user-invitation-review.test.tsx -t "checking the session"` → `Tests 1 failed | 5 skipped (6)`, `Unable to find an element with the text: Senha criada, mas não foi possível sair da conta conectada.`.
- [x] 5.2 Green: design D9; rerun all gates of 4.1 and 4.2 and the real-backend check of 4.3.
  - Green (design D9); no existing test changed. `./node_modules/.bin/vitest run` → `Test Files 27 passed (27)`, `Tests 198 passed (198)`.
  - Gates (`pnpm` unavailable; binaries from `./node_modules/.bin`): `prettier --check .` → `All matched files use Prettier code style!`; `tsc --noEmit` → exit 0; `eslint .` → exit 0; `openspec validate --all --strict --no-interactive` → `Totals: 2 passed, 0 failed (2 items)`; `node scripts/check-agent-skills.mjs` → exit 0; `vitest run --coverage` → `Tests 198 passed (198)`, `All files | 98.06 | 94.15 | 98.27 | 98.02`; `tsc --noEmit && vite build` → built; `playwright test` with a manual `vite preview` on 4173 (stopped afterwards) → `29 passed`.
  - Real-backend check of 4.3: not repeated. Port 3001 was in use by a process of another session, which was left running.
  - Repeated later the same day on ports 3101 (API) and 5273 (web), with the fixes in both working trees: 10 PASS, 0 FAIL, 25 API requests.
  - Documentation: ADR-0002 (`proposed`, creation approved by João) and its index row; the change summary and both change indexes updated; local paths removed from the published files; the GIF sentence of the authentication summary and the route line of `README.md` corrected.
  - Not covered by an automated test: a new link brought by a router navigation without `hashchange`; accessibility and 390 px checks with a dialog open; an unauthorized answer while the session is still valid.
- [x] 5.3 Refactor or dispensation.
  - Dispensed by João on 2026-11-28: the only candidate (useCallback to drop two eslint-disable) has a small gain.

## 6. Cycle 4 — Table alignment (found on a 1280 px screenshot on 2026-11-28)

- [x] 6.1 Red: test for "Wide viewport keeps the columns aligned" (Playwright, 1280 px).
  - João accepted the new scenario and this Red. Production code is unchanged.
  - Red: `./node_modules/.bin/playwright test e2e/user-administration.spec.ts` (build served by a manual `vite preview` on port 4273) → `1 failed`, `2 passed`; the failure is the assertion for the first row with "Gerar novo link": header left edges `144, 342, 541, 739, 938`, cell left edges `144, 318, 492, 667, 841`.
- [x] 6.2 Green: give the action column the same width in the header and in every row; rerun the gates of 4.1 and 4.2.
  - Green: the sixth grid track changed from `auto` to `9rem` in the header and in the rows; no test changed. As `npx -y pnpm@12.5.1 run <script>`: `format:check`, `verify` (`Tests 198 passed (198)`, `Totals: 2 passed, 0 failed (2 items)`), `test:coverage` and `build` → exit 0. Playwright against a manual `vite preview` on port 4273 → `30 passed`. A new 1280 px screenshot shows the columns aligned. The real-backend check was not repeated: only two layout classes changed.
- [x] 6.3 Refactor or dispensation.
  - Dispensed by João on 2026-11-28: the only candidate was a shared constant for the grid classes, and the new test already catches the header and the rows diverging.

## 4. Consolidation

- [x] 4.1 Run `pnpm format:check`, `pnpm verify`, `pnpm test:coverage`, `pnpm build` and `pnpm test:e2e`. Use `./node_modules/.bin/` if `pnpm` is unavailable, and record which command ran.
  - `pnpm` is unavailable; the scripts of `package.json` ran through `./node_modules/.bin`, in the same order as `verify`.
  - `./node_modules/.bin/prettier --check .` → `All matched files use Prettier code style!`.
  - `verify` = `./node_modules/.bin/tsc --noEmit` → exit 0; `./node_modules/.bin/eslint .` → exit 0; `./node_modules/.bin/vitest run` → `Test Files 25 passed (25)`, `Tests 182 passed (182)`; `./node_modules/.bin/openspec validate --all --strict --no-interactive` → `Totals: 2 passed, 0 failed (2 items)`; `node scripts/check-agent-skills.mjs` → exit 0 (skills check).
  - `./node_modules/.bin/vitest run --coverage` → `Test Files 25 passed (25)`, `Tests 182 passed (182)`, `All files | 98.46 | 95.18 | 98.05 | 98.43` (statements, branches, functions, lines); no threshold error.
  - `build` = `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build` → `built`, exit 0.
  - `test:e2e` = `./node_modules/.bin/playwright test` with the build served by a manual `vite preview` (the config calls `pnpm`) → `26 passed`.
- [x] 4.2 Run `./node_modules/.bin/openspec validate --all --strict --no-interactive`.
  - `./node_modules/.bin/openspec validate --all --strict --no-interactive` → `Totals: 2 passed, 0 failed (2 items)`.
- [x] 4.3 Test against the real local backend once its change is green: register a user, copy the link, create the password, sign in, and try the link a second time. Record the result.
  - Local, unversioned Playwright script, run once against: throwaway PostgreSQL 17 container on port 55432; the backend working tree with `s1-04-user-administration` (`prisma migrate deploy`, `prisma db seed`, `tsx src/server.ts`, port 3001); web production build (`VITE_API_URL=http://localhost:3001`, `vite build`, `vite preview` on port 5173). A fictitious customer with `erp_seller_name = 'Vendedor Teste'` was inserted by SQL. Servers and container stopped afterwards. A first run failed only on an ambiguous locator in the script (`getByLabel('Link de convite')` matched the dialog and the input); the rows it created were deleted and the corrected script was run again. Result of the second run: 10 PASS, 0 FAIL, 25 API requests.
  - 1. PASS: `lucas@distrilux.com.br` signs in; the list shows 8 rows.
  - 2. PASS: manager registered (`201`), link `http://localhost:5173/criar-senha#<43 characters>`, "Link copiado." and the clipboard equals the link, row "Convite pendente até dd/mm/aaaa hh:mm"; seller registered with "Vendedor Teste" (`201`), ERP cell "Vendedor Teste".
  - 3. PASS: same email in capitals → `POST /users 409` and "Este e-mail já está cadastrado." next to the field, typed data kept.
  - 4. PASS: manager link in an anonymous context (`lookup 200`) shows "Olá, Gerente Teste. Crie a senha para entrar com gerente.teste@distrilux.com.br."; address bar is `/criar-senha` with no fragment; no localStorage or sessionStorage.
  - 5. PASS: `accept 204`, "Entrar" with the notice and the email filled, password empty, notice gone after a reload, login (`200`) opens "Painel do comercial".
  - 6. PASS: same link again → `POST /invitations/lookup 404` and the "link no longer works" message, no form.
  - 7. PASS: "Gerar novo link" for the seller (`POST /users/{id}/invitations 201`); old link shows the invalid message (`404`), new link shows the form (`200`).
  - 8. PASS: manager "28/11/2026 05:39" as last access; seller "Convite pendente até 30/11/2026 05:39"; no renewal action on the active manager. The token is in no storage, cookie readable by script or page content after the dialog closed.
- [x] 4.4 Through `/citi-close-change`, write `docs/changes/s1-04-web-user-administration.md` and evaluate whether an ADR is needed (expected: not needed; the decisions are local to the two features).
  - Wrote `docs/changes/s1-04-web-user-administration.md` and its row in `docs/changes/README.md`; ADR decision: Not applicable (rationale in the document). `./node_modules/.bin/prettier --check .` → ok; `./node_modules/.bin/openspec validate --all --strict --no-interactive` → `Totals: 2 passed, 0 failed (2 items)`.
- [ ] 4.5 Archive only after `s1-04-web-authentication` is archived and after João's explicit confirmation immediately before the move.
