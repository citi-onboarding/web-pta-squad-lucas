import { Link } from "react-router-dom";

import { getFailureReason } from "@/shared/lib/get-failure-reason";
import type { User } from "@/features/auth/types/user";

import { rolePages } from "../role-access";
import { useSignOut } from "../use-sign-out";

export function RoleMenu({ role }: { role: User["role"] }) {
  const { mutate: signOut, error } = useSignOut();

  return (
    <nav className="border-b border-zinc-300 px-4 py-3 dark:border-zinc-700">
      <ul className="mx-auto flex max-w-2xl flex-wrap gap-x-4 gap-y-2 text-sm">
        {rolePages[role].map(({ path, title }) => (
          <li key={path}>
            <Link className="underline" to={path}>
              {title}
            </Link>
          </li>
        ))}
        <li>
          <button
            className="font-medium"
            onClick={() => signOut()}
            type="button"
          >
            Sair
          </button>
        </li>
      </ul>
      {error ? (
        <div
          className="mx-auto mt-3 max-w-2xl text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          <p>Não foi possível sair. Você continua conectado.</p>
          <p>{getFailureReason(error)}</p>
        </div>
      ) : null}
    </nav>
  );
}
