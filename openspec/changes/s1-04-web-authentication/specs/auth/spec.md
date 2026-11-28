## Purpose

Lets DistriLux users sign in to the web portal, keep and end their session, and reach only the pages allowed for their role.

## ADDED Requirements

### Requirement: Sign-in screen

The system SHALL offer a sign-in screen with the heading "Entrar no portal", the text "Use o e-mail e a senha da DistriLux.", fields labelled "E-mail" and "Senha" (the latter masked) and a button "Entrar". It MUST NOT offer self-registration.

#### Scenario: Screen content

- **WHEN** an anonymous visitor opens the sign-in screen
- **THEN** the heading, text, both fields and the button are shown, with no registration option

### Requirement: Sign-in with email and password

The system SHALL submit the email and password as entered, identifying itself as the web client, except that the email field removes leading and trailing whitespace. A wrong password and an unknown email MUST both show "E-mail ou senha incorretos". A response that does not match the agreed contract MUST NOT sign the user in.

#### Scenario: Successful sign-in

- **WHEN** a visitor submits accepted credentials
- **THEN** the user is signed in and taken to the destination of their role

#### Scenario: Late anonymous identity answer

- **WHEN** an identity check started before sign-in is answered as unauthorized after the sign-in succeeded
- **THEN** the user remains signed in at their role destination

#### Scenario: Rejected credentials

- **WHEN** the server rejects the credentials as unauthorized
- **THEN** "E-mail ou senha incorretos" is shown and the visitor stays on the sign-in screen

#### Scenario: Invalid success response

- **WHEN** sign-in succeeds with a body that violates the contract, such as an unknown role
- **THEN** no internal page or identity is shown

### Requirement: Sign-in fields and pending submission

Both sign-in fields MUST be required. The system SHALL rely on the browser's own validation to block empty fields and a malformed email and to tell the visitor the reason. While a sign-in is pending, the button SHALL be disabled and read "Entrando…", and an earlier failure message MUST NOT be shown.

#### Scenario: Invalid fields are not submitted

- **WHEN** a visitor submits with an empty field or a malformed email
- **THEN** the browser marks the field as invalid and no sign-in request is sent

#### Scenario: Sign-in pending

- **WHEN** a sign-in answer is pending, including a new attempt after a failure
- **THEN** the button reads "Entrando…" and is disabled, and no failure message is shown

### Requirement: Failure messages

The system SHALL describe a failure other than rejected credentials as an alert chosen by the kind of failure, and MUST NOT display text sent by the server. The reasons are:

- request refused as invalid (`400`): "Não foi possível validar os dados. Confira o e-mail e a senha e tente novamente."
- too many requests (`429`): "Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente."
- no connection or no answer in time: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
- any other server error or an answer that violates the contract: "O servidor não conseguiu responder corretamente. Tente novamente em instantes."

A sign-in failure SHALL show the reason. When identity cannot be determined on the root or an internal page, the system SHALL show "Não foi possível verificar sua sessão.", the reason and a button "Tentar novamente" that checks again. On the sign-in screen, an identity failure SHALL leave only the form. A failed sign-out SHALL show "Não foi possível sair. Você continua conectado." and the reason.

#### Scenario: Sign-in failure

- **WHEN** a sign-in fails for a reason other than rejected credentials
- **THEN** the matching reason is shown and the visitor stays on the sign-in screen

#### Scenario: Identity check failure with retry

- **WHEN** the identity check fails on the root or an internal page and the user chooses "Tentar novamente" after the server recovers
- **THEN** the failure and its reason are shown without internal content, and after the retry the user reaches the allowed page

#### Scenario: Identity check failure on the sign-in screen

- **WHEN** the identity check fails on the sign-in screen
- **THEN** the form is shown without a failure message

#### Scenario: Browser reports being offline

- **WHEN** the browser is offline and the user signs in, enters an internal page or signs out
- **THEN** the request is attempted and the failure is shown with the no-connection reason, without waiting for the connection to return

#### Scenario: Sign-out failure message

- **WHEN** sign-out fails for a reason other than unauthorized
- **THEN** the sign-out failure and its reason are shown and the user remains signed in

### Requirement: Credential stays out of page scripts

The system MUST rely on the server-managed `HttpOnly` session cookie, sending browser credentials with authentication requests. It MUST NOT read or store a session credential, put one in an `Authorization` header, or persist the password.

#### Scenario: Cookie-based requests

- **WHEN** a user signs in, is identified and signs out
- **THEN** each request includes browser credentials and no `Authorization` header, and browser storage holds no credential or password

### Requirement: Role destinations

After sign-in the system SHALL open: SELLER "Clientes", MANAGER "Painel do comercial", FINANCE "Fila do financeiro", ADMIN "Usuários". An authenticated user opening the sign-in screen or the portal root SHALL be taken to the same destination.

#### Scenario: Destination per role

- **WHEN** a user of each of the four roles signs in
- **THEN** the page with that role's destination title is shown

#### Scenario: Authenticated user at entry

- **WHEN** an authenticated user opens the sign-in screen or the root
- **THEN** their role destination is shown

#### Scenario: Anonymous visitor at root

- **WHEN** an anonymous visitor opens the root
- **THEN** the sign-in screen is shown

### Requirement: Role menu and page access

The system SHALL show each role only its menu entries in the listed order, followed by "Sair", and SHALL allow only the corresponding pages:

- SELLER: Clientes, Clientes em risco, Triagem de documentos, Meus pedidos.
- MANAGER: Painel do comercial, Clientes em risco, Contratos e avisos, Clientes, Triagem de documentos, Pedidos.
- FINANCE: Fila do financeiro, Pedidos, Clientes, Painel do comercial.
- ADMIN: Usuários, Carga do histórico, Sincronização com o ERP.

"Meus pedidos" and "Pedidos" are the same page, titled as in the user's menu.

#### Scenario: Menu per role

- **WHEN** a user of each role is signed in
- **THEN** the menu lists exactly that role's entries in order, followed by "Sair"

#### Scenario: Unauthorized role

- **WHEN** a signed-in user opens a page not allowed for their role, such as a SELLER opening "Usuários"
- **THEN** "Você não tem acesso a esta página" is shown and none of that page's content

#### Scenario: Contracts restricted to managers

- **WHEN** a SELLER, FINANCE or ADMIN user opens "Contratos e avisos"
- **THEN** access is refused

### Requirement: Anonymous visitors are sent to sign-in

The system SHALL take an anonymous visitor who opens an internal page to the sign-in screen without showing internal content.

#### Scenario: Direct access without session

- **WHEN** an anonymous visitor opens an internal page by its address
- **THEN** the sign-in screen is shown and internal content never appears

### Requirement: Session identity and restore

The system SHALL determine the signed-in user from the server, including after a reload. Until the answer arrives it MUST NOT show internal content. A failure to determine identity MUST NOT grant access. An unauthorized answer to an identity check MUST remove the signed-in state.

#### Scenario: Restore after reload

- **WHEN** a user with a valid session reloads an allowed page
- **THEN** the same page is shown without asking for credentials

#### Scenario: Identity still unknown

- **WHEN** the identity answer is pending
- **THEN** no internal content and no access decision is shown

#### Scenario: Identity cannot be determined

- **WHEN** the identity request fails for a reason other than unauthorized, or its body violates the contract
- **THEN** no internal content is shown

#### Scenario: Session no longer valid

- **WHEN** the server answers an identity check of a signed-in user as unauthorized
- **THEN** the sign-in screen is shown and the earlier identity is discarded

### Requirement: Sign-out

Choosing "Sair" SHALL request that the server end the session. After a successful or unauthorized answer the system MUST discard the identity and cached user data and show the sign-in screen. Going back MUST NOT reveal internal content. If sign-out fails for another reason, the system MUST NOT present the user as signed out.

#### Scenario: Successful sign-out

- **WHEN** a signed-in user chooses "Sair" and the server confirms
- **THEN** the sign-in screen is shown

#### Scenario: Back after sign-out

- **WHEN** the user goes back in browser history after signing out
- **THEN** no internal content is shown and the sign-in screen is presented

#### Scenario: Session already ended

- **WHEN** sign-out is answered as unauthorized
- **THEN** the sign-in screen is shown

#### Scenario: Late identity answer after sign-out

- **WHEN** an identity check started before sign-out is answered with the earlier user after the sign-out succeeded
- **THEN** the sign-in screen stays and no internal content is shown

#### Scenario: Sign-out fails

- **WHEN** sign-out fails with a server or network error
- **THEN** the user remains signed in and the sign-in screen is not shown

### Requirement: Narrow viewport and accessibility

At a width of 390 px, the sign-in screen, menu, destinations and refusal message SHALL be usable without horizontal page scrolling and MUST have no automatically detectable WCAG 2.1 A or AA violations.

#### Scenario: 390 px acceptance

- **WHEN** those screens are viewed at 390 px width
- **THEN** content and menu entries are reachable, there is no horizontal page scroll and the accessibility scan reports no violations
