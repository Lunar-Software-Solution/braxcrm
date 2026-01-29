import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import Settings from "./pages/Settings";
import Objects from "./pages/Objects";
import People from "./pages/People";
import PersonDetail from "./pages/PersonDetail";
import Inbox from "./pages/Inbox";
import Influencers from "./pages/Influencers";
import Resellers from "./pages/Resellers";
import Suppliers from "./pages/Suppliers";
import CorporateManagement from "./pages/CorporateManagement";
import EmailReviewQueue from "./pages/EmailReviewQueue";
import RulesLog from "./pages/RulesLog";
import UsersRoles from "./pages/UsersRoles";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            
            {/* CRM Routes with AppLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/people" element={<People />} />
              <Route path="/objects" element={<Objects />} />
              <Route path="/person/:personId" element={<PersonDetail />} />
              <Route path="/influencers" element={<Influencers />} />
              <Route path="/resellers" element={<Resellers />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/corporate-management" element={<CorporateManagement />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/review-queue" element={<EmailReviewQueue />} />
              <Route path="/rules-log" element={<RulesLog />} />
              <Route path="/users-roles" element={<UsersRoles />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
