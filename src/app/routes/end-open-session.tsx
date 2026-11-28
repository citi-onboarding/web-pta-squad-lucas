import { useEffect, useRef } from "react";

import { getFailureReason } from "@/shared/lib/get-failure-reason";

import { useEndOpenSession } from "../use-end-open-session";

// Nothing but a failure is shown until no session is left in this browser.
export function EndOpenSession({ onEnded }: { onEnded: () => void }) {
  const { mutate, error } = useEndOpenSession();
  const started = useRef(false);
  const end = () => mutate(undefined, { onSuccess: onEnded });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      end();
    }
    // Starts once; the retry button covers later attempts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!error) {
    return null;
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div role="alert">
        <p className="font-semibold">
          Senha criada, mas não foi possível sair da conta conectada.
        </p>
        <p className="mt-2">{getFailureReason(error)}</p>
      </div>
      <button
        className="bg-foreground text-background mt-4 rounded-md px-4 py-2 font-medium"
        onClick={end}
        type="button"
      >
        Tentar novamente
      </button>
    </main>
  );
}
