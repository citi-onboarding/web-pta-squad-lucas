import { getFailureReason } from "@/shared/lib/get-failure-reason";

type IdentityFailureProps = {
  error: Error;
  onRetry: () => void;
};

export function IdentityFailure({ error, onRetry }: IdentityFailureProps) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div role="alert">
        <p className="font-semibold">Não foi possível verificar sua sessão.</p>
        <p className="mt-2">{getFailureReason(error)}</p>
      </div>
      <button
        className="bg-foreground text-background mt-6 rounded-md px-4 py-2 font-medium"
        onClick={onRetry}
        type="button"
      >
        Tentar novamente
      </button>
    </main>
  );
}
