---
title: ADR-0002
status: proposed
date: 2026-11-28
owners: [João]
tags: [web, security, authentication, invitations, sprint-1]
supersedes: null
superseded_by: null
---

# 0002: Invitation link token in the URL fragment, never kept by the browser

## Context

Only the administrator registers users, and each person creates their own password through a one-time link that the administrator copies and delivers. The backend issues a token that is returned only when the invitation is created, accepts it only in request bodies and stores only its digest (backend ADR-0005). Whoever holds the token can set the password of the invited account while the invitation is usable, so the web client must not widen the places where it can be read: server and proxy logs, the `Referer` header, browser history, browser storage, client caches and screenshots.

The web client builds the link, so how the token travels and how long the browser holds it is a web decision that later screens have to preserve.

## Decision

**Scope of approval.** João approved creating this record. The decision follows design D3, D4 and D9 of the change `s1-04-web-user-administration`. The squad has not reviewed it, so this ADR stays `proposed` until accepted under `docs/adr/README.md`.

- The link is `<portal origin>/criar-senha#<token>`. The origin is the portal the administrator is using, and the token travels in the URL fragment, which the browser does not send to any server or in `Referer`.
- The invitation page reads the fragment into component state and immediately removes it from the address bar with `history.replaceState`, without adding a history entry. A new fragment received by the open page is treated as a new link and removed the same way.
- The page sends the token to the API only in request bodies.
- On the administrator side, the token exists only in the state of the link dialog and is dropped when the dialog closes. While a submission is pending the dialog cannot be abandoned, so an issued link is not lost.
- The token is never written to `localStorage`, `sessionStorage`, a query key or navigation state. It does not stay in a client cache after the screen that uses it is gone: lookup and acceptance are mutations, and every mutation that receives or returns the token uses `gcTime: 0`, so it leaves the cache as soon as that screen unmounts.
- Rules for future changes: any new flow with a one-time credential in a link follows the same rules, and the token must not be added to analytics, error reports or logs.

## Consequences

### Positive

- The token does not reach web server or proxy logs through the page request, and is not sent in `Referer`.
- A reload, the browser history or a screenshot taken after the page loads does not show it.
- Nothing in the browser can show the link again after the dialog closes.

### Negative

- Reloading `/criar-senha` loses the token; the person has to open the original link again.
- A link closed before being copied cannot be recovered; the administrator has to issue a new one, which stops the previous one.
- Until the page script runs, the full link is in the address bar and may stay in the browser's own history of visited addresses.
- Anyone who gets the delivered link can use it while it is valid; single use and expiry on the server limit this.

## Alternatives considered

### Token in a query parameter

Rejected: it reaches web server logs and `Referer`.

### Query keyed by the token for the lookup

Rejected: the token would stay in the query key and in the query cache.

### Keeping the token in browser storage to survive a reload

Rejected: it would leave a usable credential on a possibly shared machine.

## References

- [Change summary](../changes/s1-04-web-user-administration.md)
- OpenSpec change `openspec/changes/s1-04-web-user-administration/` (specs `user-invitation` and `user-administration`, design D3, D4 and D9)
- Backend ADR-0005, account activation through invitations with a digest-only token, in the backend repository
