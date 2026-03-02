import { createBrowserRouter } from "react-router";
import { Dashboard } from "./components/Dashboard";
import { ModulePage } from "./components/ModulePage";
import { LoginPage } from "./components/LoginPage";
import { SignUpPage } from "./components/SignUpPage";
import { AuthGuard } from "./components/AuthGuard";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/signup",
    Component: SignUpPage,
  },
  {
    Component: AuthGuard,
    children: [
      {
        path: "/",
        Component: Dashboard,
      },
      {
        path: "/module/:moduleId",
        Component: ModulePage,
      },
    ],
  },
]);
