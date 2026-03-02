import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ThemeProvider } from "./components/ThemeContext";
import { AuthProvider } from "./components/AuthContext";
import { ModulesProvider } from "./components/ModulesContext";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ModulesProvider>
          <RouterProvider router={router} />
        </ModulesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
