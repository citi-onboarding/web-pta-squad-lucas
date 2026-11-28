---
title: ADR-0001
status: proposed
date: 2026-11-28
owners: [João]
tags: [web, security, authentication, routing, sprint-1]
supersedes: null
superseded_by: null
---

# 0001: Session identity as server state and route protection composed in `app`

## Context

The portal needs to know who is signed in before any role-restricted page can be built, and every later business feature depends on that answer. The backend delivers the web credential as an `HttpOnly` cookie (backend ADR-0004), so the browser code cannot read it. Features must not import other features, and the server renews the session on each identity request, which limits how the client may ask for it.

## Decision

**Scope of approval.** The decision follows design D1 to D3 of the change `s1-04-web-authentication`. The squad has not reviewed it, so this ADR stays `proposed` until accepted under `docs/adr/README.md`.

- The `auth` feature holds schemas, API functions, query and mutation options and the sign-in view. Routes, guards, the menu, the role table and the placeholder pages live in `src/app`, so business features take no dependency on `auth`.
- `src/app` builds one API client with `credentials: "include"`. The browser code never reads or stores the credential.
- The `me` query result is the only identity state. A `401` means anonymous; any other failure stays an error. Identity is not copied into a client store or browser storage.
- A guard refetches identity when a protected route is entered. There is no polling, because each identity request renews the server session and would defeat the inactivity limit.
- Sign-in cancels a pending identity request before writing the user, and sign-out cancels in-flight queries and clears the cache, so a late response cannot undo either.
- Rules for future changes: route protection is a user experience boundary only, and the server authorizes all data. New pages are added to the role table in `src/app`. A business screen that receives `401` must trigger an identity check.

## Consequences

### Positive

- One source of identity and one declarative role-to-page table.
- No credential reachable by page scripts.
- Business features stay independent from authentication.

### Negative

- Each navigation to a protected page waits for an identity request.
- An expired or revoked session is detected only at the next identity check.
- The web and API origins must be same-site, with the web origin in the credentialed CORS list.

## Alternatives considered

### Guard in `shared`

`shared` would depend on authentication behavior.

### Role checks inside each page

Easy to omit in a new page.

### Client store or React context holding the user

A second copy of server state that can go stale.

### Token readable by the browser code

Exposes the credential to page scripts and was already rejected by the backend ADR-0004.

## References

- `openspec/changes/s1-04-web-authentication/design.md` (D1 to D3, D7)
- `docs/changes/s1-04-web-authentication.md`
- ADR-0004 "opaque session authentication" in the backend repository
