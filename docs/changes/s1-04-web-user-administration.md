---
change_id: s1-04-web-user-administration
date: 2026-11-28
status: in-progress
owners: [joao]
tags: [web, auth, users, invitations]
related_adrs: [ADR-0002]
openspec_change: openspec/changes/s1-04-web-user-administration/
---

# Web user administration and invitation page

## Objective

The administrator could not onboard anyone from the portal because "Usuários" was a placeholder. This change lists users, registers them with a role (and the ERP seller for sellers) and delivers one-time invitation links; the invited person creates their own password at `/criar-senha`. There is no self-registration.

## Change made

- New feature `src/features/user-administration`: Zod-validated API functions for `GET /api/v1/users`, `GET /api/v1/users/erp-seller-names`, `POST /api/v1/users` and `POST /api/v1/users/{userId}/invitations`; TanStack Query options for the two lists; mutations for registration and new invitation; the page, the registration dialog, the invitation link dialog and the renewal dialog. A `409` is mapped through its `conflictField` to a fixed Portuguese message, never to server text.
- New feature `src/features/user-invitation`: API functions for `POST /api/v1/invitations/lookup` and `/accept` (token in the request body), the password validation (8 characters minimum, 72 bytes maximum in UTF-8, matching confirmation) and the invitation page. The page reads the URL fragment once, removes it with `history.replaceState` and keeps the token only in component state.
- `src/app`: `/usuarios` renders the user page for ADMIN; new public route `/criar-senha`; the sign-in route reads `createdEmail` from navigation state once and clears it with a replace, so the notice does not survive a reload.
- `getFailureReason` moved from `src/features/auth/lib` to `src/shared/lib` without changing its texts, so both new features share it without importing `auth`.
- Invitation tokens do not outlive the screen that uses them: the registration, new-invitation, lookup and acceptance mutations use `gcTime: 0` and none of them is stored under a query key.
- Review fixes (design D9): `user-administration` reports unauthorized answers through `onUnauthorized` and `src/app` refetches the identity; pending dialogs disable "Cancelar" and block both the Escape `keydown` and the `cancel` event; the ERP seller names have loading and failure states; the invitation page remounts its content for each new fragment token; after a password is created `src/app` checks the identity and ends an open session before showing "Entrar".
- The user table is built with ARIA roles on `div` elements so each value carries its column label at 390 px without changing the cell text; the renewal button sits in a `gridcell` outside the five data cells.

## Resulting behavior

- On a wide viewport every value stays aligned with its column header, with or without the "Gerar novo link" action.
- ADMIN sees the subtitle and a table with Nome, E-mail, Papel, Vendedor no ERP and Último acesso, with "Carregando usuários…", a failure message with its reason and "Tentar novamente".
- Last access reads `dd/mm/aaaa hh:mm`, "Nunca acessou", "Convite pendente até …" or "Convite vencido"; non-sellers show "—" as ERP seller.
- "+ Cadastrar usuário" opens a dialog; the ERP seller field is enabled and required only for "Vendedor", offers only the available names and, when none is available, shows the waiting message and disables "Cadastrar". Email and ERP seller conflicts show next to their field; other failures show the reason and keep the typed data.
- After a registration or a new invitation the dialog shows `<origin>/criar-senha#<token>` in a read-only field with "Copiar link" ("Link copiado." or the manual-copy message) and "Fechar". The link is not shown again and is not stored.
- "Gerar novo link" appears only on pending or expired rows and asks for confirmation first.
- `/criar-senha` shows "Verificando convite…", then the form for a usable invitation, or the "link no longer works" message for a missing, used, replaced or expired token; check failures offer "Tentar novamente".
- The form validates length, UTF-8 byte limit and confirmation before sending, shows "Criando…" while pending and keeps the form on failure.
- After creating the password the visitor lands on "Entrar" with "Senha criada. Entre com seu e-mail e senha." and the email filled; a reload shows neither.
- If another session is open in that browser, it is ended first. When checking or ending it fails, the page shows "Senha criada, mas não foi possível sair da conta conectada.", the reason and "Tentar novamente"; the password is not sent again.
- A new invitation link opened in the same tab replaces the earlier state and typed passwords and is checked.
- If a request on "Usuários" answers unauthorized and the session is gone, the sign-in screen is shown; if the session is still valid, the failure is shown like any other.
- While a registration or a new invitation is pending, "Cancelar" is disabled and Escape does not close the dialog.
- For the "Vendedor" role, the ERP seller field reads "Carregando vendedores…" while loading, and a loading failure shows its reason and "Tentar novamente"; "Cadastrar" is disabled in both states.

## Impact

- Routes: `/criar-senha` is new and public; `/usuarios` now has content for ADMIN. No other route changes.
- API: consumes six endpoints of the backend change `s1-04-user-administration` (bodies fixed in its design D9a). No change to the transport core, cookie handling or role table.
- Security: the token travels in the URL fragment and in request bodies only, is removed from the address bar after reading and is never stored in the browser or its caches. Page protection remains a UX boundary; the backend authorizes each operation.
- Code: existing `auth` code changes only in the `getFailureReason` import and the sign-in notice. No new runtime dependency.
- Compatibility: the `auth` delta adds a requirement to a capability created by `s1-04-web-authentication`; that change must be archived first.
- Risk: the real-backend check below used the backend working tree of `s1-04-user-administration`, not a released build.

## Validations executed

`pnpm` was unavailable, so the `package.json` scripts ran through `./node_modules/.bin`.

- `./node_modules/.bin/prettier --check .` → `All matched files use Prettier code style!`
- `./node_modules/.bin/tsc --noEmit` → exit 0.
- `./node_modules/.bin/eslint .` → exit 0.
- `./node_modules/.bin/vitest run` → `Test Files 27 passed (27)`, `Tests 198 passed (198)`.
- `./node_modules/.bin/vitest run --coverage` → `All files | 98.06 | 94.15 | 98.27 | 98.02`, no threshold error.
- `./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vite build` → built, exit 0.
- `./node_modules/.bin/playwright test` (build served by a manual `vite preview`) → `32 passed`, after the table alignment fix and the dialog coverage; `format:check`, `verify`, `test:coverage` and `build` were rerun after it, with the same test counts and coverage as above.
- `node scripts/check-agent-skills.mjs` → exit 0.
- `./node_modules/.bin/openspec validate --all --strict --no-interactive` → `Totals: 2 passed, 0 failed (2 items)`.
- Real backend (local, unversioned script), repeated **after the review fixes** on alternative ports (API 3101, web 5273): throwaway PostgreSQL, the backend `s1-04-user-administration` working tree and the web production build → 10 PASS, 0 FAIL, 25 API requests: listing the 8 seeded users, registering a manager and a seller, the real `409` with `conflictField`, lookup and acceptance, sign-in to "Painel do comercial", the real `404` for a reused link, a new link invalidating the old one, and the final list states. The specific review-fix cases (ended session, cancel while pending, names failure, new link in the same tab, another open session) are covered only by simulated HTTP.
- The TDD evidence of each cycle (Red, Green, Refactor) is in `openspec/changes/s1-04-web-user-administration/tasks.md`.

ADR decision: **required.** The handling of the invitation link token (fragment, removed from the address bar, sent only in request bodies, not kept by the browser or its caches) establishes a security invariant that later changes must preserve. See [ADR-0002](../adr/0002-invitation-link-token-handling.md), `proposed`. The other choices of this change are local and reversible and are recorded here and in `design.md`.

## Related artifacts

- Proposal: `openspec/changes/s1-04-web-user-administration/proposal.md`
- Design: `openspec/changes/s1-04-web-user-administration/design.md`
- Specs: `openspec/changes/s1-04-web-user-administration/specs/user-administration/spec.md`, `specs/user-invitation/spec.md`, `specs/auth/spec.md`
- Tasks: `openspec/changes/s1-04-web-user-administration/tasks.md`
- Backend contract: change `s1-04-user-administration` in the backend repository (design D2 to D9a)
- Related ADRs: [ADR-0002](../adr/0002-invitation-link-token-handling.md); backend ADR-0005 in the backend repository.

## Usage

Sign in as ADMIN, open "Usuários" and choose "+ Cadastrar usuário". Copy the link from the dialog and deliver it to the person; it is valid for 48 hours and works once. Use "Gerar novo link" on a pending or expired row to replace it.

## Implementation notes

- The native `<dialog>` falls back to the `open` attribute when `showModal` is missing (jsdom), so the unit tests do not exercise the modal behavior; Playwright covers Escape on the pending dialogs, and the 390 px and accessibility checks of the filled registration, invitation link and new link dialogs. The ERP seller conflict and names failure states were checked at 390 px only by a one-off, unversioned script.
- Preventing only the dialog `cancel` event lets Chromium close it on a repeated Escape, so the Escape `keydown` is blocked too while a submission is pending.
- A new link brought by an in-app router navigation, without a `hashchange` event, has no automated test.
- A failure while ending another session is lost on reload; the password has already been created at that point.
- React StrictMode is not exercised by the tests; the lookup is guarded by a `ref` against a double call.
- Not archived: it waits for `s1-04-web-authentication` to be archived and for João's explicit confirmation.
