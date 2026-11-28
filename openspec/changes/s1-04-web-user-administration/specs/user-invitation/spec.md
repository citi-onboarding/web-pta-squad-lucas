## Purpose

Lets a person who received an invitation link create their password without a session, see clearly when a link no longer works, and then sign in.

## ADDED Requirements

### Requirement: Another link in the same tab

When the address of the open invitation page receives a new token in its fragment, the page SHALL treat it as a newly opened link: discard the earlier state and typed passwords, remove the fragment and check the new invitation.

#### Scenario: New link pasted over an unusable one

- **GIVEN** the page shows that the link no longer works
- **WHEN** the visitor opens `/criar-senha#<new token>` in the same tab
- **THEN** the fragment is removed and the new invitation is checked and shown

### Requirement: Invitation page

The page `/criar-senha` SHALL be reachable without a session. It SHALL read the invitation token from the URL fragment, remove the fragment from the address bar without adding a history entry, and check the invitation with the server, showing "Verificando convite…" meanwhile. For a usable invitation it SHALL show the title "Criar senha" and "Olá, <nome>. Crie a senha para entrar com <e-mail>.". The token SHALL NOT be stored in the browser.

#### Scenario: Usable invitation

- **WHEN** a visitor opens `/criar-senha#<token>` for a usable invitation
- **THEN** the server receives the token in the request body, the address bar shows `/criar-senha` without the fragment, and the page shows the invited name and email

#### Scenario: Link no longer works

- **WHEN** the server answers that the invitation is unusable, or the address has no token
- **THEN** the page shows "Este link de convite não vale mais. Ele pode ter vencido ou já ter sido usado. Peça um novo link ao administrador." and no password field

#### Scenario: Check failure

- **WHEN** checking the invitation fails for another reason and the visitor chooses "Tentar novamente" after the server recovers
- **THEN** "Não foi possível verificar o convite.", the reason as defined by the `auth` capability failure messages and "Tentar novamente" are shown, and after the retry the form is shown

### Requirement: Password creation

The form SHALL have the required fields "Senha" and "Confirmar senha", the hint "Use de 8 a 72 caracteres." and the button "Criar senha". Before sending, the system SHALL show next to the field, without sending the request: "A senha precisa ter pelo menos 8 caracteres." for fewer than 8 characters, "A senha é longa demais. Use no máximo 72 caracteres." for more than 72 bytes in UTF-8, and "As senhas não são iguais." when the confirmation differs. While pending, the button SHALL be disabled and read "Criando…". On success the system SHALL go to "Entrar" as defined by the `auth` capability requirement "Sign-in after password creation". If the server answers that the invitation is unusable, the page SHALL show the "link no longer works" message. Other failures SHALL show the reason as defined by the `auth` capability failure messages and keep the form. The passwords SHALL NOT be persisted in the browser.

#### Scenario: Password is created

- **WHEN** the visitor types the same valid password twice and chooses "Criar senha"
- **THEN** the server receives the token and the password, and the visitor is taken to "Entrar"

#### Scenario: Password too short

- **WHEN** the visitor types a 7-character password
- **THEN** "A senha precisa ter pelo menos 8 caracteres." is shown and no request is sent

#### Scenario: Password too long in bytes

- **WHEN** the visitor types 40 accented characters (80 bytes)
- **THEN** "A senha é longa demais. Use no máximo 72 caracteres." is shown and no request is sent

#### Scenario: Confirmation differs

- **WHEN** the confirmation differs from the password
- **THEN** "As senhas não são iguais." is shown and no request is sent

#### Scenario: Link used meanwhile

- **WHEN** the server answers the acceptance that the invitation is unusable
- **THEN** the "link no longer works" message is shown instead of the form

#### Scenario: Pending and no connection

- **WHEN** the acceptance is pending and then fails with no connection
- **THEN** the button reads "Criando…" and is disabled while pending, and afterwards the no-connection reason is shown and the form is kept

#### Scenario: Narrow viewport

- **WHEN** the page is shown at 390 px wide
- **THEN** the form is usable without horizontal scrolling and passes the automated accessibility check
