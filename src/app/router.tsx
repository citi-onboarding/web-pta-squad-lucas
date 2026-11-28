import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";

import { pagePaths } from "./role-access";
import { CreatePasswordRoute } from "./routes/create-password-route";
import { NotFoundPage } from "./routes/not-found-page";
import { RequireIdentity } from "./routes/require-identity";
import { RootRoute } from "./routes/root-route";
import { RolePage } from "./routes/role-page";
import { RouteErrorPage } from "./routes/route-error-page";
import { SignInRoute } from "./routes/sign-in-route";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootRoute />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/entrar",
    element: <SignInRoute />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/criar-senha",
    element: <CreatePasswordRoute />,
    errorElement: <RouteErrorPage />,
  },
  ...pagePaths.map((path) => ({
    path,
    element: (
      // The key remounts the guard on each page, which triggers a new check.
      <RequireIdentity key={path}>
        {(user) => <RolePage path={path} role={user.role} />}
      </RequireIdentity>
    ),
    errorElement: <RouteErrorPage />,
  })),
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
