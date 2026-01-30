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
import Profile from "./pages/Profile";
import Objects from "./pages/Objects";
import People from "./pages/People";
import PersonDetail from "./pages/PersonDetail";
import Inbox from "./pages/Inbox";
import Influencers from "./pages/Influencers";
import Resellers from "./pages/Resellers";
import ProductSuppliers from "./pages/ProductSuppliers";
import ExpenseSuppliers from "./pages/ExpenseSuppliers";
import CorporateManagement from "./pages/CorporateManagement";
import PersonalContacts from "./pages/PersonalContacts";
import Subscriptions from "./pages/Subscriptions";
import MerchantAccounts from "./pages/MerchantAccounts";
import LogisticSuppliers from "./pages/LogisticSuppliers";
import MarketingSources from "./pages/MarketingSources";
import RulesProcessingQueue from "./pages/RulesProcessingQueue";
import ClassificationProcessingQueue from "./pages/ClassificationProcessingQueue";
import RulesLog from "./pages/RulesLog";
import EmailAutomation from "./pages/EmailAutomation";
import EmailAutomationHub from "./pages/EmailAutomationHub";
import SequenceBuilder from "./pages/SequenceBuilder";
import TriggerEditor from "./pages/TriggerEditor";
import TemplateEditor from "./pages/TemplateEditor";
import UsersRoles from "./pages/UsersRoles";
import Tasks from "./pages/Tasks";
import Opportunities from "./pages/Opportunities";
import Senders from "./pages/Senders";
import ImportProcessingQueue from "./pages/ImportProcessingQueue";
import ImportLog from "./pages/ImportLog";
import ImportEndpoints from "./pages/ImportEndpoints";
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
              <Route path="/product-suppliers" element={<ProductSuppliers />} />
              <Route path="/expense-suppliers" element={<ExpenseSuppliers />} />
              <Route path="/corporate-management" element={<CorporateManagement />} />
              <Route path="/personal-contacts" element={<PersonalContacts />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/marketing-sources" element={<MarketingSources />} />
              <Route path="/merchant-accounts" element={<MerchantAccounts />} />
              <Route path="/logistic-suppliers" element={<LogisticSuppliers />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/classification-processing-queue" element={<ClassificationProcessingQueue />} />
              <Route path="/rules-processing-queue" element={<RulesProcessingQueue />} />
              <Route path="/rules-log" element={<RulesLog />} />
              <Route path="/email-automation" element={<EmailAutomation />} />
              <Route path="/email-automation-hub" element={<EmailAutomationHub />} />
              <Route path="/email-automation/sequences/:sequenceId" element={<SequenceBuilder />} />
              <Route path="/email-automation/triggers/:triggerId" element={<TriggerEditor />} />
              <Route path="/email-automation/templates/:templateId" element={<TemplateEditor />} />
              <Route path="/users-roles" element={<UsersRoles />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/opportunities" element={<Opportunities />} />
              <Route path="/senders" element={<Senders />} />
              <Route path="/import-queue" element={<ImportProcessingQueue />} />
              <Route path="/import-log" element={<ImportLog />} />
              <Route path="/import-endpoints" element={<ImportEndpoints />} />
              
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
