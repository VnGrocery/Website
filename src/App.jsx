import { Navigate, Route, Routes } from "react-router-dom";
import { ApiProvider } from "./lib/api.jsx";
import { RequireSession, SessionProvider, useSession } from "./lib/session.jsx";
import Layout from "./components/Layout.jsx";
import { ConfirmProvider } from "./components/ConfirmDialog.jsx";
import { ToastProvider } from "./components/ToastStack.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import BuyerChecksPage from "./pages/BuyerChecksPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import FreshnessReportsPage from "./pages/FreshnessReportsPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import ShopDetailPage from "./pages/ShopDetailPage.jsx";
import ShopsPage from "./pages/ShopsPage.jsx";
import ToolsPage from "./pages/ToolsPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import VerifyEventPage from "./pages/VerifyEventPage.jsx";
import VerifyResourcePage from "./pages/VerifyResourcePage.jsx";

function App() {
  return (
    <SessionProvider>
      <ToastProvider>
        <ConfirmProvider>
          <ApiProvider>
            <AppRoutes />
          </ApiProvider>
        </ConfirmProvider>
      </ToastProvider>
    </SessionProvider>
  );
}

function AppRoutes() {
  const { session } = useSession();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage session={session} />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage session={session} />} />
      <Route path="/reset-password" element={<ResetPasswordPage session={session} />} />
      <Route
        path="/*"
        element={
          <RequireSession>
            <Layout />
          </RequireSession>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="shops" element={<ShopsPage />} />
        <Route path="shops/:shopId" element={<ShopDetailPage />} />
        <Route path="buyer-checks" element={<BuyerChecksPage />} />
        <Route path="freshness-reports" element={<FreshnessReportsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/verify" element={<VerifyResourcePage />} />
        <Route path="events/:eventId/verify" element={<VerifyEventPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
