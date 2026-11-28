---
change_id: s1-04-web-authentication
date: 2026-11-28
status: in-progress
owners: [joao]
tags: [web, auth, roles, sprint-1]
related_adrs: [ADR-0001]
openspec_change: openspec/changes/s1-04-web-authentication/
---

# Web sign-in, role access and sign-out

## Objective

DistriLux users could not sign in to the web portal, and role-restricted features had nothing to build on. This change adds sign-in, session identity, sign-out and access by role (card S1-04).

## Change made

- New feature `src/features/auth`: Zod-validated calls to `POST /api/v1/auth/login`, `GET /api/v1/auth/me` and `POST /api/v1/auth/logout`, query and mutation options and the sign-in screen.
- `src/app`: one API client with `credentials: "include"`, identity guard, role table, role menu, placeholder pages and sign-out.
- `/` redirects to sign-in or to the role destination; the boilerplate home is no longer reachable.
- The identity query and the sign-in and sign-out mutations use `networkMode: "always"`, so an offline browser shows a failure instead of pausing.
- A late anonymous identity answer can no longer undo a sign-in.
- The later change `s1-04-web-user-administration` moves `getFailureReason` to `src/shared/lib`, replaces the "Usuários" placeholder and adds the sign-in notice.

## Resulting behavior

- Sign-in sends the web client type and relies on the `HttpOnly` cookie; wrong email and wrong password show the same message.
- Each role lands on its destination and sees only its menu entries: seller on "Clientes", manager on "Painel do comercial", finance on "Fila do financeiro", administrator on "Usuários".
- A page outside the role shows "Você não tem acesso a esta página"; "Contratos e avisos" is for managers only.
- An anonymous visitor on an internal page is taken to sign-in.
- Reload restores the session; after sign-out the back button does not reveal internal content.
- Empty or malformed fields are blocked by the browser; a pending sign-in shows "Entrando…"; each failure kind has its own message, and an identity failure offers "Tentar novamente".

## Impact

- Routes: `/entrar` and the role pages are new; role pages other than "Usuários" show only their title.
- API: consumes the three endpoints of the backend change `s1-04-user-authentication`; no contract is defined here.
- Security: no credential or password is read or stored by the browser code. Route protection is a UX boundary; the backend authorizes data.
- Environment: web and API must be same-site, and the web origin must be in the API's CORS list. HTTPS and deployed domains were not verified.
- Code: no new runtime dependency.

## Validations executed

`pnpm` ran through `npx -y pnpm@12.5.1 run <script>` on 2026-11-28, on the working tree that also contains `s1-04-web-user-administration`.

- `format:check` → exit 0.
- `verify` (typecheck, lint, tests, strict OpenSpec validation, skills check) → exit 0, `Totals: 2 passed, 0 failed (2 items)`.
- `test:coverage` → `Test Files 25 passed (25)`, `Tests 182 passed (182)`, `All files | 98.46 | 95.18 | 98.05 | 98.43`.
- `build` → exit 0.
- `./node_modules/.bin/playwright test` (build served by a manual `vite preview`) → `26 passed`.
- Real local backend, before the user administration change: web production build at 390 px with the seeded users. Anonymous redirect, the four destinations, cookie attributes, reload, sign-out, back navigation, revoked and idle sessions, seller refused on `/usuarios`, offline message and CORS were verified (task 8.4).
- A 390 px GIF of the four destinations and the blocked seller was recorded against that real backend. It is not versioned and will be attached to the pull request.
- Not covered by an automated test: clearing the mutation cache on sign-out, the request timeout, and `role="alert"` for rejected credentials in Vitest (Playwright covers it).

ADR decision: **required.** The change establishes a security invariant (the browser never handles the credential) and a durable boundary for route protection and identity. See [ADR-0001](../adr/0001-web-session-identity-and-route-protection.md), `proposed`.

## Related artifacts

- Proposal: `openspec/changes/s1-04-web-authentication/proposal.md`
- Design: `openspec/changes/s1-04-web-authentication/design.md`
- Spec: `openspec/changes/s1-04-web-authentication/specs/auth/spec.md`
- Tasks: `openspec/changes/s1-04-web-authentication/tasks.md`
- ADR: `docs/adr/0001-web-session-identity-and-route-protection.md`

## Usage

Open the portal, sign in with a registered email and password, and use "Sair" to end the session.

## Implementation notes

- A session that expires while a page is open is detected at the next navigation or reload.
- The configurable 24-hour absolute session limit is not part of this change and is not implemented.
- Not archived: it waits for explicit confirmation immediately before archiving.
