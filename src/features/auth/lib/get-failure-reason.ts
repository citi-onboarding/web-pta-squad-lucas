import { ApiContractError, ApiError } from "@/shared/lib/api/errors";

const serverReason =
  "O servidor não conseguiu responder corretamente. Tente novamente em instantes.";

// Chosen from the kind of failure only. Server text is never displayed.
export function getFailureReason(error: Error) {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return "Não foi possível validar os dados. Confira o e-mail e a senha e tente novamente.";
    }

    if (error.status === 429) {
      return "Muitas tentativas em pouco tempo. Aguarde um minuto e tente novamente.";
    }

    return serverReason;
  }

  if (error instanceof ApiContractError) {
    return serverReason;
  }

  return "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
}
