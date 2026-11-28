## Purpose

Gives the administrator a page to see every portal user and their account state, register new users with a role and, for sellers, the ERP seller link, and deliver one-time invitation links.

## ADDED Requirements

### Requirement: User list

The "Usuários" page, reachable only by ADMIN as defined by the `auth` capability, SHALL show the subtitle "Não há autocadastro. Cada vendedor é ligado ao vendedor do ERP, que define a carteira." and a table with the columns "Nome", "E-mail", "Papel", "Vendedor no ERP" and "Último acesso", in the order the server returns. Roles SHALL read "Vendedor", "Gerente", "Financeiro" and "Administrador". An empty ERP seller name SHALL read "—". The last access column SHALL show:

- for an active user who has signed in, the date and time as `dd/mm/aaaa hh:mm` in the browser's time zone;
- for an active user who never signed in, "Nunca acessou";
- for an invited user, "Convite pendente até dd/mm/aaaa hh:mm";
- for a user whose invitation expired, "Convite vencido".

While the list loads, the page SHALL show "Carregando usuários…". A failure SHALL show "Não foi possível carregar os usuários.", the reason as defined by the `auth` capability failure messages and a "Tentar novamente" button.

#### Scenario: Users are listed

- **GIVEN** the server returns an active seller with ERP seller name and a last access, an active manager who never signed in, an invited finance user and an administrator with an expired invitation
- **WHEN** the administrator opens "Usuários"
- **THEN** the four rows show the role names, "—" for non-sellers, the formatted last access, "Nunca acessou", "Convite pendente até …" with the expiry, and "Convite vencido"

#### Scenario: List failure with retry

- **WHEN** listing users fails and the administrator chooses "Tentar novamente" after the server recovers
- **THEN** the failure message and its reason are shown, and after the retry the table is shown

#### Scenario: Wide viewport keeps the columns aligned

- **GIVEN** the server returns users with and without the "Gerar novo link" action
- **WHEN** the page is shown at 1280 px wide
- **THEN** in every row each of the five values starts at the same horizontal position as its column header

#### Scenario: Narrow viewport

- **WHEN** the page is shown at 390 px wide
- **THEN** every row stays readable without horizontal scrolling, each value labelled by its column name, and the page passes the automated accessibility check

### Requirement: User registration

The "+ Cadastrar usuário" button SHALL open the dialog "Cadastrar usuário" with the fields "Nome", "E-mail", "Papel" and "Vendedor no ERP (só para vendedores)", the note "A pessoa recebe um link para criar a senha." and the buttons "Cancelar" and "Cadastrar". Name, email and role SHALL be required, with the browser's own validation for empty fields and a malformed email. The ERP seller field SHALL be enabled and required only when the role is "Vendedor", and SHALL offer only the available ERP seller names returned by the server; when none is available it SHALL read "Nenhum vendedor do ERP disponível. Aguarde a próxima sincronização." and registration of a seller SHALL NOT be possible. While registering, the button SHALL be disabled and read "Cadastrando…". A conflict SHALL be shown next to the field: "Este e-mail já está cadastrado." or "Este vendedor do ERP já está ligado a outro usuário.". Other failures SHALL show the reason as defined by the `auth` capability failure messages, keeping the typed data. On success the dialog SHALL show the invitation link and the list SHALL include the new user.

#### Scenario: Manager is registered

- **WHEN** the administrator fills name, email and role "Gerente" and chooses "Cadastrar"
- **THEN** the server receives that data without an ERP seller name, the invitation link is shown, and the list then includes the user as "Convite pendente até …"

#### Scenario: Seller requires an available ERP seller name

- **GIVEN** the server returns the available ERP seller names "Ana Souza" and "Bruno Lima"
- **WHEN** the administrator chooses role "Vendedor"
- **THEN** the ERP seller field is enabled, offers exactly those two names, and registration is not submitted until one is chosen

#### Scenario: ERP seller field only for sellers

- **WHEN** the administrator chooses a role other than "Vendedor" after choosing an ERP seller name
- **THEN** the field is disabled and no ERP seller name is sent

#### Scenario: No ERP seller name available

- **GIVEN** the server returns no available ERP seller name
- **WHEN** the administrator chooses role "Vendedor"
- **THEN** the field reads "Nenhum vendedor do ERP disponível. Aguarde a próxima sincronização." and "Cadastrar" is disabled

#### Scenario: Email already registered

- **WHEN** the server answers registration with a conflict on the email
- **THEN** "Este e-mail já está cadastrado." is shown next to the email field and the typed data is kept

#### Scenario: ERP seller name already linked

- **WHEN** the server answers registration with a conflict on the ERP seller name
- **THEN** "Este vendedor do ERP já está ligado a outro usuário." is shown next to that field

#### Scenario: Registration pending and other failures

- **WHEN** registration is pending and then fails with no connection
- **THEN** the button reads "Cadastrando…" and is disabled while pending, and afterwards the no-connection reason is shown with the typed data kept

### Requirement: Invitation link delivery

After a registration or a new invitation, the system SHALL show the link built from the portal's own address as `<origin>/criar-senha#<token>`, in a read-only field, with the text "Entregue este link a <nome>. Ele vale até dd/mm/aaaa hh:mm e só pode ser usado uma vez. Por segurança, ele não será mostrado de novo.", a "Copiar link" button and a "Fechar" button. Copying SHALL confirm with "Link copiado."; if the browser refuses, it SHALL show "Não foi possível copiar. Selecione o link e copie manualmente.". Once closed, the link SHALL NOT be shown again and SHALL NOT be kept in the browser.

#### Scenario: Link is copied

- **WHEN** the administrator chooses "Copiar link"
- **THEN** the clipboard receives exactly `<origin>/criar-senha#<token>` and "Link copiado." is shown

#### Scenario: Clipboard refused

- **WHEN** the browser refuses the clipboard write
- **THEN** "Não foi possível copiar. Selecione o link e copie manualmente." is shown and the link stays selectable

#### Scenario: Link is not shown again

- **WHEN** the administrator closes the link dialog and reloads the page
- **THEN** the link is not visible anywhere and browser storage does not contain the token

### Requirement: New invitation link

The system SHALL offer "Gerar novo link" on each row with "Convite pendente" or "Convite vencido" and on no other row. Choosing it SHALL ask "Gerar um novo link para <nome>? O link anterior deixa de funcionar." with "Cancelar" and "Gerar novo link". On confirmation it SHALL request a new invitation and show the link as in "Invitation link delivery", and the row SHALL then read "Convite pendente até …" with the new expiry. A failure SHALL show the reason as defined by the `auth` capability failure messages.

#### Scenario: Expired invitation is renewed

- **WHEN** the administrator confirms "Gerar novo link" on a row with "Convite vencido"
- **THEN** the new link is shown and the row reads "Convite pendente até …" with the new expiry

#### Scenario: Cancelled renewal

- **WHEN** the administrator chooses "Gerar novo link" and then "Cancelar"
- **THEN** no request is sent

#### Scenario: Active users have no renewal

- **WHEN** the list shows active users
- **THEN** their rows have no "Gerar novo link" action

### Requirement: Ended session on the user page

When listing users, listing ERP seller names, registering or issuing a new invitation answers unauthorized, the system SHALL check the session identity again and, when the visitor is anonymous, SHALL show the sign-in screen without internal content. When the session is still valid, the failure SHALL be shown like any other failure.

#### Scenario: Session ended while on the page

- **GIVEN** an administrator on "Usuários" whose session has ended
- **WHEN** one of those requests answers unauthorized
- **THEN** the sign-in screen is shown

### Requirement: Pending submission cannot be abandoned

While a registration or a new invitation is pending, "Cancelar" SHALL be disabled and the Escape key SHALL NOT close the dialog, so that the issued link is always shown.

#### Scenario: Cancel during registration

- **WHEN** a registration is pending and the administrator chooses "Cancelar" or presses Escape
- **THEN** the dialog stays open and, when the answer arrives, the invitation link is shown

#### Scenario: Cancel during a new invitation

- **WHEN** a new invitation is pending and the administrator chooses "Cancelar" or presses Escape
- **THEN** the dialog stays open and, when the answer arrives, the invitation link is shown

### Requirement: ERP seller names loading and failure

These states apply only while the chosen role is "Vendedor". While the ERP seller names load for a seller, the ERP seller field SHALL be disabled and read "Carregando vendedores…", and "Cadastrar" SHALL be disabled. When loading fails, the dialog SHALL show "Não foi possível carregar os vendedores do ERP.", the reason as defined by the `auth` capability failure messages and a "Tentar novamente" button, and a seller SHALL NOT be registered.

#### Scenario: Names still loading

- **WHEN** the administrator chooses role "Vendedor" before the names arrive
- **THEN** the field is disabled and reads "Carregando vendedores…"

#### Scenario: Names failure with retry

- **WHEN** loading the names fails and the administrator chooses "Tentar novamente" after the server recovers
- **THEN** the failure and its reason are shown, and after the retry the names are offered
