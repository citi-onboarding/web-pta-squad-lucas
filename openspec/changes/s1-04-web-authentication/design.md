## Context

See `proposal.md` and `specs/auth/spec.md`. Today the router has only `/` (boilerplate home) and a not-found route. `AppProviders` creates a `QueryClient` and uses a module-level browser router. `createBrowserApiClient` targets `VITE_API_URL` (default `http://localhost:3001`), rejects absolute request paths, validates success bodies with Zod and defaults to `credentials: "same-origin"`. The query client retries once by default.

Sources: the local task sheet F01 and sprint notes (a local summary of the card; DocuData was not read), the offline prototype (`pEntrar`, `NAV`) for copy and menus, and the draft backend design `s1-04-user-authentication` (D4, D7, D10, D13) for the contract.

Contract consumed:

| Request                                                            | Success        | Errors     |
| ------------------------------------------------------------------ | -------------- | ---------- |
| `POST api/v1/auth/login` with `{ email, password, client: "web" }` | `200 { user }` | `400, 401` |
| `GET api/v1/auth/me`                                               | `200 user`     | `401`      |
| `POST api/v1/auth/logout`                                          | `204`          | `401`      |

`user` is the strict object `{ id: uuid, name, email, role: SELLER | MANAGER | FINANCE | ADMIN, erpSellerName: string | null }`. The cookie is `__Host-session; HttpOnly; Secure; SameSite=Strict; Path=/`. Error bodies are Problem Details; the UI decides on status and never displays server text.

## Goals / Non-Goals

**Goals:** a testable `auth` feature with an injected `ApiClient`; one source of identity; one declarative role-to-page table.

**Non-Goals:** reusable authorization for other features' data; proactive expiry detection; return-to-requested-page after sign-in; a design system.

## Decisions

### D1. `src/features/auth` plus composition in `src/app`

The feature holds schemas, `api/*.ts` functions, query/mutation options and the sign-in view. Routes, guards, menu, role table and placeholder pages live in `src/app`, so future business features receive no dependency on `auth`. Rejected: guard in `shared` (shared would depend on authentication behavior); role checks inside each page (easy to omit).

### D2. API client with `credentials: "include"`

`src/app` builds one client with `credentials: "include"`, needed because the default web and API origins differ in port. No `getAuthHeaders`. Paths stay relative. If a deployment serves both from one origin, `same-origin` would suffice; `include` remains correct. Rejected: changing the transport default for every consumer; storing a token.

Sign-out parses the empty `204` body with a schema that accepts only `undefined`.

### D3. Identity is a TanStack Query result

The `me` query is the only identity state, with `retry: false`. A `401` maps to an anonymous result (`null`); any other failure stays an error. Sign-in cancels any pending identity request and then writes the validated user to that query, so a late anonymous answer cannot undo it. Sign-out cancels in-flight queries, clears the cache and sets the identity to anonymous, so a late response cannot restore it. A guard does not reuse stale identity on entry to a protected route (identity is refetched on navigation). No polling: each `me` renews the server session, so polling would defeat the inactivity limit. Rejected: a client store or React context copy; persisting the user in browser storage.

The identity query and the sign-in and sign-out mutations use `networkMode: "always"`: with the default mode they pause while the browser reports being offline and no failure is shown. Rejected: changing the shared query client default, which would affect other features.

### D4. Internal paths (proposal, reversible)

| Path                 | Page                    |
| -------------------- | ----------------------- |
| `/entrar`            | Sign-in                 |
| `/clientes`          | Clientes                |
| `/clientes-em-risco` | Clientes em risco       |
| `/triagem`           | Triagem de documentos   |
| `/pedidos`           | Meus pedidos / Pedidos  |
| `/painel`            | Painel do comercial     |
| `/contratos`         | Contratos e avisos      |
| `/financeiro/fila`   | Fila do financeiro      |
| `/usuarios`          | Usuários                |
| `/carga`             | Carga do histórico      |
| `/sincronizacao`     | Sincronização com o ERP |

`/` redirects to sign-in or the role destination, replacing the boilerplate home. Redirects replace the history entry. Unknown paths keep the existing not-found page. Placeholder pages show only the title.

### D5. Contract tests with MSW

Handlers simulate the three routes in Vitest; the real transport, feature and router run unmocked. MSW cannot prove cookie attributes, CORS or revocation. Playwright intercepts the API at network level for flows, 390 px and axe, so it needs no published backend.

### D6. Real browser and backend verification is conditional

It requires web and API on the same site for `SameSite=Strict`, a context where the browser accepts a `Secure` cookie, and the web origin in the API's credentialed CORS list. `localhost:5173` with `localhost:3001` is expected to qualify in a modern browser; mixing `localhost` and `127.0.0.1` (Playwright's current base URL) is cross-site. Neither is verified yet, and no deployment infrastructure is assumed. Until verified, evidence must be labelled as simulated.

### D7. ADR

Route protection and session identity composition are cross-cutting. During Consolidation, create a web ADR for D1–D3 from the template, referencing the backend ADR-0004 (credential transport) without restating it.

## Risks / Trade-offs

- [Draft backend contract may change] → Schemas are isolated in the feature; update the spec first.
- [Client guards can be bypassed] → The server authorizes all data.
- [Session expires while a page is open] → Detected at the next identity check (navigation or reload). Business requests that receive `401` must trigger one when those screens are built.
- [Another tab signs out] → Same mitigation.
- [Different sites in deployment] → The cookie will not be sent; needs a new backend decision.

## Open Questions

None. The GIF was recorded against a real local backend (tasks 8.3 and 8.4).

Decided by João on 2026-11-28 (behavior in the spec):

- Failure messages are chosen from the kind of failure, never from server text. Sign-in and sign-out use their own buttons to retry; a failed identity check gets a retry button.
- Fields use native browser validation, so the browser controls the warning copy and language. The pending button reads "Entrando…".
- `type="email"` removing surrounding whitespace is accepted. Ignoring letter case belongs to the backend lookup and needs its own backend change; the web sends the value unchanged.
