
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import ClubResidents from "./pages/ClubResidents";
import Join from "./pages/Join";

// Lazy load admin pages
const AdminViewParticipant = lazy(() => import("./pages/AdminViewParticipant"));
// Lazy load Telegram Mini App — изолирован от основного приложения, без useAuth
const TelegramApp = lazy(() => import("./pages/TelegramApp"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Загрузка...</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/club-residents" element={<ClubResidents />} />
            <Route path="/join" element={<Join />} />
            <Route path="/admin/view-participant/:userId" element={<AdminViewParticipant />} />
            <Route path="/telegram" element={<TelegramApp />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

