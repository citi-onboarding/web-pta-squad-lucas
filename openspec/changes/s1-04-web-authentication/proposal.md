## Why

DistriLux users need to sign in to the web portal and reach only the pages of their role (card S1-04, as summarised in the local task sheet F01). The web app has no authentication yet, and other role-restricted features depend on it.

## What Changes

- Sign-in screen "Entrar" using the server-managed `HttpOnly` cookie session (`client: "web"`).
- Current identity lookup, session restore after reload, and sign-out.
- Role destinations after sign-in, role menu, and page protection for anonymous visitors and unauthorized roles.
- Placeholder pages for destinations and menu items, with no business content.
- The boilerplate home page at `/` stops being a reachable screen.
- Acceptance evidence: 390 px viewport, a GIF of the four role destinations and of a blocked seller, Playwright + axe.

### In scope

The items above.

### Out of scope

ADMIN user list and registration form, invitations and password definition, business screens, mobile app, backend changes, deployment infrastructure, session expiry rules (enforced by the server).

## Capabilities

### New Capabilities

- `auth`: web sign-in, session identity and sign-out, role destinations, menu and page protection.

### Modified Capabilities

None.

## Impact

- **Business:** unblocks role-restricted web features.
- **Security:** the browser code never reads or stores the credential. Route protection is a user experience boundary only; the server must authorize all data.
- **API contract:** consumes `POST /api/v1/auth/login`, `GET /api/v1/auth/me` and `POST /api/v1/auth/logout` as drafted in decision D10 of the backend change `s1-04-user-authentication`. No contract is changed here. Tests simulate it with MSW, so they do not require a published backend.
- **Code:** new `src/features/auth`; routing and provider composition in `src/app`; existing router and end-to-end tests for the home page change. No new runtime dependency.
