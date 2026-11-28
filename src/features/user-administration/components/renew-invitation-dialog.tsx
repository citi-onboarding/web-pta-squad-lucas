import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClient } from "@/shared/lib/api/create-client";
import { getFailureReason } from "@/shared/lib/get-failure-reason";

import { useReportUnauthorized } from "../lib/use-report-unauthorized";
import { createInvitationMutationOptions } from "../queries/user-mutations";
import { usersQueryKey } from "../queries/users-query";
import type { AdminUser, Invitation } from "../types/user";
import { ModalDialog } from "./modal-dialog";

type RenewInvitationDialogProps = {
  apiClient: ApiClient;
  user: AdminUser;
  onCancel: () => void;
  onRenewed: (invitation: Invitation) => void;
  onUnauthorized: () => void;
};

export function RenewInvitationDialog({
  apiClient,
  user,
  onCancel,
  onRenewed,
  onUnauthorized,
}: RenewInvitationDialogProps) {
  const queryClient = useQueryClient();
  const { mutate, error, isPending } = useMutation(
    createInvitationMutationOptions(apiClient),
  );

  useReportUnauthorized(error, onUnauthorized);

  return (
    <ModalDialog
      dismissible={!isPending}
      onClose={onCancel}
      title="Gerar novo link"
    >
      <p className="mt-2 text-sm">
        Gerar um novo link para {user.name}? O link anterior deixa de funcionar.
      </p>
      {error ? (
        <div
          className="mt-3 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          <p>{getFailureReason(error)}</p>
        </div>
      ) : null}
      <div className="mt-4 flex justify-end gap-3">
        <button
          className="rounded-md border border-zinc-500 px-4 py-2 disabled:opacity-60"
          disabled={isPending}
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="bg-foreground text-background rounded-md px-4 py-2 font-medium disabled:opacity-60"
          disabled={isPending}
          onClick={() =>
            mutate(user.id, {
              onSuccess: (invitation) => {
                void queryClient.invalidateQueries({ queryKey: usersQueryKey });
                onRenewed(invitation);
              },
            })
          }
          type="button"
        >
          Gerar novo link
        </button>
      </div>
    </ModalDialog>
  );
}
