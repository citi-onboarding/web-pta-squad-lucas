## Why

F01 (card S1-04) requires that only the administrator lists and registers users and that each person creates their own password through an invitation link the administrator copies and delivers, with no self-registration. The "Usuários" page is still a placeholder, so nobody can be onboarded from the portal.

## What Changes

- The ADMIN "Usuários" page lists users with name, email, role, ERP seller name and last access. A user who has not created a password shows the invitation state ("Convite pendente" or "Convite vencido") in the last access column, with a "Gerar novo link" action.
- "Cadastrar usuário" dialog: name, email, role and, for sellers only, a required choice among the ERP seller names already synchronized and not linked to a user. Success shows the invitation link once, with a "Copiar link" action and its expiry.
- New public page "Criar senha" at `/criar-senha`, opened from the invitation link. It shows who the invitation is for and asks for the password twice (8 to 72 characters). A used, replaced or expired link shows that it no longer works and tells the person to ask the administrator for a new one.
- After creating the password, the person is taken to "Entrar" with the email filled in and a success notice; no session is opened.
- The invitation token travels in the URL fragment and is removed from the address bar once read.

### In scope

The items above, including failure messages, 390 px layout and Playwright + axe coverage.

### Out of scope

- Editing, deactivating or deleting users, changing a role, password reset or "esqueci a senha".
- Sending email; search, filters or pagination of the user list.
- Any backend change (owned by `s1-04-user-administration` in the backend repository) and the mobile app.
- The "Carga do histórico" and "Sincronização com o ERP" pages.

## Capabilities

### New Capabilities

- `user-administration`: the ADMIN user list with account status, the registration dialog with the ERP seller choice, and the delivery of invitation links.
- `user-invitation`: the public page where an invited person creates their password from the link.

### Modified Capabilities

- `auth` (still an active change, `s1-04-web-authentication`): the sign-in screen can open with an email filled in and a notice after a password is created. Added as a new requirement; `s1-04-web-authentication` must be archived first.

## Impact

- **Business:** the administrator onboards users from the portal; the invited person activates their account without technical help.
- **Security:** the invitation link is shown only once, the token is never sent to the web server (URL fragment) and is removed from the address bar after it is read; the browser never stores it. Page protection stays a user experience boundary; the backend authorizes every operation.
- **API contract:** consumes `GET /api/v1/users`, `POST /api/v1/users`, `POST /api/v1/users/{userId}/invitations`, `GET /api/v1/users/erp-seller-names`, `POST /api/v1/invitations/lookup` and `POST /api/v1/invitations/accept`, as specified in the backend change `s1-04-user-administration`. Tests simulate them with MSW.
- **Code:** new `src/features/user-administration` and `src/features/user-invitation`; routes in `src/app`; the sign-in route reads navigation state. No new runtime dependency.
