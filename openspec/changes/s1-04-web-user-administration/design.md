## Context

See `proposal.md` for motivation and `specs/` for the required behavior.

- `s1-04-web-authentication` (active) delivers sign-in with the `HttpOnly` cookie, identity, role menu and page protection. `/usuarios` is an ADMIN-only placeholder page rendered by `RolePage`. Failure reasons are mapped by `src/features/auth/lib/get-failure-reason.ts`, which a new feature cannot import.
- The backend contract comes from the backend change `s1-04-user-administration` (design D2–D8). The token is returned only in the `201` bodies; lookup and acceptance are `POST` with the token in the body; unusable invitations answer `404`; conflicts answer `409` with the `conflictField` member.
- API dates are absolute ISO strings and must go through `parseAbsolute`.

## Goals / Non-Goals

**Goals:**

- Two features, `src/features/user-administration` and `src/features/user-invitation`, each with injected `ApiClient`, Zod validation at the endpoint boundary and TanStack Query for server state.
- Tests simulate the backend with MSW only; the clock and the clipboard are the only other doubles.

**Non-Goals:**

- Changing the transport core, the cookie handling or the role table.
- Sharing UI components between the two features beyond what already lives in `src/shared`.

## Decisions

### D1. Failure reasons move to `src/shared`

Both new features need the same reason texts as the sign-in. `getFailureReason` is promoted from `src/features/auth/lib` to `src/shared/lib` without changing its texts or its tests; `auth` then imports it from there. This is the only edit to existing `auth` code besides D5. Alternative rejected: copying the mapping into each feature, which would let the texts drift.

### D2. Conflict detail mapping

The registration `409` Problem Details carries the extension member `conflictField` with `"email"` or `"erpSellerName"` (backend design D3). The endpoint function validates it with Zod and the page shows the fixed Portuguese message for that field; it never displays server text. A `409` without a valid `conflictField` shows the generic server-error reason.

### D3. Invitation link built from `window.location.origin`

`<origin>/criar-senha#<token>`. No `VITE_*` variable is needed, and the link always points to the portal the administrator is using. The token lives only in component state of the link dialog and is dropped when it closes; it is never placed in the query cache (the registration mutation result is not cached under a query key).

### D4. Token in the fragment, removed after reading

The page reads `location.hash` once on mount, then calls `history.replaceState` to `/criar-senha` without the fragment, so a reload or a shared screenshot does not show it. The fragment is never sent to the web server or in `Referer`. Lookup and acceptance send the token in the body. Alternative rejected: a query parameter, which reaches server logs and `Referer`.

The lookup runs as a TanStack Query mutation triggered once on mount, so the token is never part of a query key or of the query cache. Alternative rejected: a query keyed by the token, which would keep it in the cache.

### D5. Notice on "Entrar" through navigation state, cleared after reading

After acceptance the page navigates to `/entrar` with `state: { createdEmail }`. The sign-in route reads it once, fills the email, shows the notice and immediately replaces the history entry without state, because browser history keeps `state` across a reload. Alternative rejected: a query parameter with the email, which would leave personal data in the address bar and history.

### D6. Last access column

`lastLoginAt` and `invitationExpiresAt` are parsed with `parseAbsolute` and formatted with `Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })` in the browser's time zone. Tests pin the time zone through the existing date test setup.

### D7. Registration dialog and list refresh

The dialog uses a native `<dialog>` with focus trapped by the browser. On success the user list query is invalidated, so the new row comes from the server. The available ERP seller names query is fetched when the dialog opens and invalidated after a successful seller registration.

### D8. Password byte limit in the browser

`new TextEncoder().encode(password).length > 72` mirrors the backend rule; the server still validates. The fields use `autocomplete="new-password"`.

### D9. Review fixes (2026-11-28)

- Unauthorized answers: `user-administration` exposes an `onUnauthorized` callback; `src/app` refetches the identity query, so the existing guard redirects. The feature does not import `auth`.
- While a submission is pending, the dialog disables "Cancelar" and prevents both the Escape `keydown` and the dialog `cancel` event; preventing only `cancel` lets Chromium close the dialog on the third Escape (measured in the Red of 2026-11-28). Rejected: keeping the mutation alive after unmounting, which would show a link outside its dialog.
- The invitation page listens to `hashchange` (and router location changes) and remounts its content for each new token.
- Ending another session after password creation is composed in `src/app`, which owns both features and the existing sign-out. It checks the identity first and signs out only when a session exists.

## Risks / Trade-offs

- [The administrator closes the dialog before copying] → "Gerar novo link" on the row; the spec text warns that the link is shown once.
- [Clipboard API unavailable on plain HTTP or old browsers] → read-only field stays selectable and the fallback message tells the administrator to copy manually.
- [Backend contract changes during its own TDD] → MSW handlers and Zod schemas are the single place to update; the web Green waits for the backend contract to be accepted by João, not for the backend implementation.
- [Archive order] → the `auth` delta adds a requirement to a capability created by `s1-04-web-authentication`; archive that change first.
