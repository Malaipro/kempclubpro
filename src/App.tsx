
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import ClubResidents from "./pages/ClubResidents";
import Join from "./pages/Join";
import { PasswordChangeGuard } from "./components/PasswordChangeGuard";
const ChangePassword = lazy(() => import("./pages/ChangePassword"));

// Lazy load admin pages
const AdminViewParticipant = lazy(() => import("./pages/AdminViewParticipant"));
// Lazy load Telegram Mini App — изолирован от основного приложения, без useAuth
const TelegramApp = lazy(() => import("./pages/TelegramApp"));
// OAuth consent screen for MCP agent integrations
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
// Веб-версия Mini App (kemp-app.ru)
const WebApp = lazy(() => import("./pages/WebApp"));
const AppLogin = lazy(() => import("./pages/AppLogin"));
const AppResetPassword = lazy(() => import("./pages/AppResetPassword"));

const queryClient = new QueryClient();

// На домене kemp-app.ru корень ведёт сразу в кабинет; на kempclub.pro — лендинг.
const RootRoute = () => {
  const host = window.location.hostname;
  if (host === 'kemp-app.ru' || host === 'www.kemp-app.ru') {
    return <Navigate to="/app" replace />;
  }
  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<PasswordChangeGuard><Dashboard /></PasswordChangeGuard>} />
            <Route path="/club-residents" element={<ClubResidents />} />
            <Route path="/join" element={<Join />} />
            <Route path="/admin/*" element={<PasswordChangeGuard><Routes><Route path="view-participant/:userId" element={<AdminViewParticipant />} /><Route path="*" element={<NotFound />} /></Routes></PasswordChangeGuard>} />
            <Route path="/telegram" element={<TelegramApp />} />
            <Route path="/app" element={<PasswordChangeGuard><WebApp /></PasswordChangeGuard>} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/app/login" element={<AppLogin />} />
            <Route path="/app/reset-password" element={<AppResetPassword />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

