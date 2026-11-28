const maxPasswordBytes = 72;
const minPasswordLength = 8;

export function validatePassword(password: string, confirmation: string) {
  if (password.length < minPasswordLength) {
    return {
      field: "password",
      message: "A senha precisa ter pelo menos 8 caracteres.",
    } as const;
  }

  if (new TextEncoder().encode(password).length > maxPasswordBytes) {
    return {
      field: "password",
      message: "A senha é longa demais. Use no máximo 72 caracteres.",
    } as const;
  }

  if (password !== confirmation) {
    return {
      field: "confirmation",
      message: "As senhas não são iguais.",
    } as const;
  }

  return null;
}
