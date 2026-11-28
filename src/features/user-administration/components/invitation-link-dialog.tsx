import { useState } from "react";

import { formatDateTime } from "../lib/format-date-time";
import { ModalDialog } from "./modal-dialog";

type InvitationLinkDialogProps = {
  name: string;
  token: string;
  expiresAt: string;
  onClose: () => void;
};

export function InvitationLinkDialog({
  name,
  token,
  expiresAt,
  onClose,
}: InvitationLinkDialogProps) {
  const [copyResult, setCopyResult] = useState<"copied" | "refused" | null>(
    null,
  );
  const link = `${window.location.origin}/criar-senha#${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopyResult("copied");
    } catch {
      setCopyResult("refused");
    }
  }

  return (
    <ModalDialog onClose={onClose} title="Link de convite">
      <p className="mt-2 text-sm">
        Entregue este link a {name}. Ele vale até {formatDateTime(expiresAt)} e
        só pode ser usado uma vez. Por segurança, ele não será mostrado de novo.
      </p>
      <input
        aria-label="Link de convite"
        className="mt-3 block w-full rounded-md border border-zinc-500 bg-transparent px-3 py-2 text-sm"
        readOnly
        value={link}
      />
      <p className="mt-2 min-h-5 text-sm" role="status">
        {copyResult === "copied" ? "Link copiado." : null}
        {copyResult === "refused"
          ? "Não foi possível copiar. Selecione o link e copie manualmente."
          : null}
      </p>
      <div className="mt-4 flex justify-end gap-3">
        <button
          className="rounded-md border border-zinc-500 px-4 py-2"
          onClick={onClose}
          type="button"
        >
          Fechar
        </button>
        <button
          className="bg-foreground text-background rounded-md px-4 py-2 font-medium"
          onClick={() => void copy()}
          type="button"
        >
          Copiar link
        </button>
      </div>
    </ModalDialog>
  );
}
