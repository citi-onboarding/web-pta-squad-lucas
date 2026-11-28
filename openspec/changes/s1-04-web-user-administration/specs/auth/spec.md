## ADDED Requirements

### Requirement: Sign-in after password creation

When the visitor arrives at "Entrar" right after creating a password, the sign-in screen SHALL show the notice "Senha criada. Entre com seu e-mail e senha." and the email field filled in with the invited email. The notice and the filled email SHALL NOT appear when "Entrar" is opened in any other way, including a reload. The password field SHALL stay empty.

#### Scenario: Notice after password creation

- **WHEN** a visitor creates a password for `nova@distrilux.com.br`
- **THEN** "Entrar" shows "Senha criada. Entre com seu e-mail e senha.", the email field holds `nova@distrilux.com.br` and the password field is empty

#### Scenario: Notice does not survive a reload

- **WHEN** the visitor reloads "Entrar" after that
- **THEN** the notice is not shown

### Requirement: Password creation ends another open session

After a password is created, the system SHALL check whether the browser has a signed-in session and, when it does, SHALL end that session before showing "Entrar" with the notice and the invited email. A session that had already ended counts as ended. If checking or ending it fails otherwise, the system SHALL show "Senha criada, mas não foi possível sair da conta conectada.", the reason as defined by the failure messages and a "Tentar novamente" button that tries to end the session again.

#### Scenario: Another account is signed in

- **GIVEN** a browser signed in as the administrator
- **WHEN** the invited person's password is created in it
- **THEN** the administrator's session is ended and "Entrar" shows the notice with the invited email

#### Scenario: Ending the session fails

- **WHEN** ending the open session fails with no connection and the visitor chooses "Tentar novamente" after the connection returns
- **THEN** the failure message and reason are shown, and after the retry "Entrar" shows the notice

#### Scenario: Checking the session fails

- **WHEN** checking for an open session fails after the password is created, and the visitor chooses "Tentar novamente" after the server recovers
- **THEN** the failure message and reason are shown, the password is not sent again, and after the retry "Entrar" shows the notice
